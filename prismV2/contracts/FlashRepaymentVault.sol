// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/IAaveAndUniswap.sol";

/**
 * @title FlashRepaymentVault
 * @author PRISM — Predictive Risk Intelligence & Smart Protection for DeFi
 * @notice Automated Liquidation Shield & Flash-Repayment Vault (CSI ORIGIN 2026 Problem Statement #11)
 * @dev Implements Aave V3 IFlashLoanSimpleReceiver + Uniswap V3 ISwapRouter for 1-tx atomic position restructuring.
 * 
 * Complete Atomic Lifecycle:
 * 1. PRISM Off-chain Risk Engine detects position near liquidation threshold (e.g. HF < 1.15).
 * 2. PRISM Engine computes minimum effective debt intervention (Repay*) and selects optimal collateral to swap.
 * 3. initiateFlashRescue() borrows Repay* in debt asset via Aave V3 Flash Loan (0.05% fee).
 * 4. executeOperation() callback executes:
 *    a. Repays borrower's debt on Aave V3 Pool.
 *    b. Pulls newly unlocked collateral from Aave V3 Pool.
 *    c. Swaps unlocked collateral -> debt asset on Uniswap V3.
 *    d. Approves and repays Flash Loan (principal + 5 bps fee).
 *    e. Verifies on-chain Safety Invariant: New Health Factor >= Target HF (Reverts if false).
 *    f. Transfers any excess surplus profit back to the borrower.
 */
contract FlashRepaymentVault is IFlashLoanSimpleReceiver {
    // ─────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────
    error UnauthorizedCaller();
    error InvalidInitiator();
    error InsufficientSwapOutput(uint256 received, uint256 required);
    error TargetHealthFactorNotReached(uint256 currentHF, uint256 targetHF);
    error TransferFailed();

    // ─────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────
    event FlashRescueExecuted(
        address indexed borrower,
        address indexed collateralAsset,
        address indexed debtAsset,
        uint256 debtRepaid,
        uint256 collateralWithdrawn,
        uint256 flashFee,
        uint256 postHealthFactor
    );

    event SurplusRefunded(address indexed borrower, address indexed token, uint256 amount);

    // ─────────────────────────────────────────────────────────
    // State Variables
    // ─────────────────────────────────────────────────────────
    IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;
    IPool public immutable POOL;
    ISwapRouter public immutable SWAP_ROUTER;
    address public owner;

    struct RescueParams {
        address borrower;
        address collateralAsset;
        uint256 collateralToWithdraw;
        uint24 poolFee;            // e.g. 500 = 0.05%, 3000 = 0.3%
        uint256 minAmountOut;      // Slippage protection for Uniswap swap
        uint256 minTargetHealthFactor; // e.g. 1.20 * 1e18
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert UnauthorizedCaller();
        _;
    }

    constructor(address _addressesProvider, address _swapRouter) {
        ADDRESSES_PROVIDER = IPoolAddressesProvider(_addressesProvider);
        POOL = IPool(IPoolAddressesProvider(_addressesProvider).getPool());
        SWAP_ROUTER = ISwapRouter(_swapRouter);
        owner = msg.sender;
    }

    /**
     * @notice Initiates the autonomous flash rescue sequence.
     * @param debtAsset The asset borrowed on Aave that needs repayment (e.g. USDC, DAI).
     * @param repayAmount The calculated minimum effective intervention amount.
     * @param params Struct containing collateral details, slippage, and target health factor.
     */
    function initiateFlashRescue(
        address debtAsset,
        uint256 repayAmount,
        RescueParams calldata params
    ) external {
        bytes memory encodedParams = abi.encode(params);

        // Request flash loan from Aave V3 Pool
        POOL.flashLoanSimple(
            address(this),
            debtAsset,
            repayAmount,
            encodedParams,
            0 // referralCode
        );
    }

    /**
     * @notice Aave V3 Flash Loan Callback. Executes atomic restructuring.
     * @dev Called exclusively by Aave V3 Pool contract.
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        if (msg.sender != address(POOL)) revert UnauthorizedCaller();
        if (initiator != address(this)) revert InvalidInitiator();

        RescueParams memory rescueData = abi.decode(params, (RescueParams));
        uint256 totalDebtToRepay = amount + premium;

        // 1. Approve Aave Pool to use flash-loaned debt asset
        IERC20(asset).approve(address(POOL), amount);

        // 2. Repay borrower's debt on Aave V3 (interestRateMode = 2 for Variable Debt)
        POOL.repay(asset, amount, 2, rescueData.borrower);

        // 3. Withdraw unlocked collateral from Aave V3 Pool to this vault
        // Note: Borrower must have approved delegation or vault is authorized operator
        POOL.withdraw(
            rescueData.collateralAsset,
            rescueData.collateralToWithdraw,
            address(this)
        );

        // 4. Swap released collateral -> debt asset on Uniswap V3
        IERC20(rescueData.collateralAsset).approve(
            address(SWAP_ROUTER),
            rescueData.collateralToWithdraw
        );

        ISwapRouter.ExactInputSingleParams memory swapParams = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: rescueData.collateralAsset,
                tokenOut: asset,
                fee: rescueData.poolFee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: rescueData.collateralToWithdraw,
                amountOutMinimum: rescueData.minAmountOut,
                sqrtPriceLimitX96: 0
            });

        uint256 amountReceived = SWAP_ROUTER.exactInputSingle(swapParams);

        if (amountReceived < totalDebtToRepay) {
            revert InsufficientSwapOutput(amountReceived, totalDebtToRepay);
        }

        // 5. Approve Aave Pool to pull flash loan principal + 0.05% premium
        IERC20(asset).approve(address(POOL), totalDebtToRepay);

        // 6. On-Chain Invariant Check: Verify borrower's Health Factor is restored
        (, , , , , uint256 currentHF) = POOL.getUserAccountData(rescueData.borrower);
        if (currentHF < rescueData.minTargetHealthFactor) {
            revert TargetHealthFactorNotReached(currentHF, rescueData.minTargetHealthFactor);
        }

        // 7. Refund any excess surplus debt tokens from swap back to borrower
        uint256 surplus = amountReceived - totalDebtToRepay;
        if (surplus > 0) {
            bool success = IERC20(asset).transfer(rescueData.borrower, surplus);
            if (!success) revert TransferFailed();
            emit SurplusRefunded(rescueData.borrower, asset, surplus);
        }

        emit FlashRescueExecuted(
            rescueData.borrower,
            rescueData.collateralAsset,
            asset,
            amount,
            rescueData.collateralToWithdraw,
            premium,
            currentHF
        );

        return true;
    }

    /**
     * @notice Emergency sweep function for tokens accidentally sent to contract.
     */
    function emergencySweep(address token, address to) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(to, balance);
        }
    }
}

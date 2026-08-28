# PRISM
## Autonomous Liquidation Shield

> **"PRISM predicts liquidation risk, calculates the minimum intervention required, and autonomously restructures an at-risk ETH/USDC position before liquidation."**

[![Python](https://img.shields.io/badge/Python-3.11+-blue?style=flat-square)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-green?style=flat-square)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square)](https://typescriptlang.org)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.x-gray?style=flat-square)](https://soliditylang.org)

---

## Table of Contents

1. [What is PRISM?](#what-is-prism)
2. [The Problem](#the-problem)
3. [How PRISM Solves It](#how-prism-solves-it)
4. [Core Innovation](#core-innovation)
5. [Architecture Overview](#architecture-overview)
6. [Mathematical Formulas](#mathematical-formulas)
7. [ML Model](#ml-model)
8. [Gemini AI Layer](#gemini-ai-layer)
9. [Technology Stack](#technology-stack)
10. [Inputs & Outputs](#inputs--outputs)
11. [Operational Modes](#operational-modes)
12. [API Reference](#api-reference)
13. [Smart Contract Architecture](#smart-contract-architecture)
14. [Environment Variables](#environment-variables)
15. [Installation & Quick Start](#installation--quick-start)
16. [Demo Walkthrough](#demo-walkthrough)
17. [Failure Cases](#failure-cases)
18. [Security Model](#security-model)
19. [Limitations & Disclaimers](#limitations--disclaimers)
20. [Future Roadmap](#future-roadmap)

---

## What is PRISM?

**PRISM** (Predictive Risk Intelligence & Smart Protection Management) is a full-stack DeFi risk management system that continuously monitors, predicts, and autonomously restructures at-risk ETH/USDC lending positions on Aave V3 — preventing liquidation before it happens.

PRISM operates on the principle:

> **"Don't wait for liquidation. Detect risk early, calculate the minimum intervention required, verify economic viability, and execute the rescue atomically."**

The system integrates five engines into a single decision pipeline:

```
PREDICT → OPTIMIZE → EVALUATE → EXECUTE → VERIFY
```

| Engine | Role |
|--------|------|
| **ML Model** | Predicts liquidation probability using gradient boosting |
| **Risk Engine** | Deterministic multi-factor risk scoring (0-100) |
| **Intervention Engine** | Calculates minimum debt repayment using closed-form math |
| **Economic Gate** | Validates rescue is cheaper than liquidation penalty |
| **Rescue Simulator** | Simulates atomic ETH→USDC swap + debt repayment |

---

## The Problem

In overcollateralized DeFi protocols like **Aave V3**, users deposit collateral (ETH) to borrow stablecoins (USDC). When ETH price falls:

1. Collateral value decreases
2. **Health Factor** (HF) drops toward the liquidation boundary (HF = 1.0)
3. At HF < 1.0, third-party liquidator bots seize up to **50% of collateral** at a discounted price
4. The user pays an immediate **5-15% liquidation penalty** on the seized amount
5. This happens within seconds — humans cannot react fast enough
6. MEV bots frontrun and exacerbate slippage

**The Core Problem**: The user may have valuable ETH collateral, but no liquid USDC available immediately to repay debt and prevent liquidation.

---

## How PRISM Solves It

PRISM sources **temporary flash liquidity**, repays the minimum required debt, sells just enough ETH collateral to repay the flash loan — all in a single atomic transaction:

```
1.  Risk Detection          → HF < Target HF threshold
2.  Volatility Analysis     → ETH annualized 30d volatility
3.  ML Prediction           → P(liquidation) from gradient boosting
4.  Target HF Optimization  → Dynamic buffer = f(volatility, velocity)
5.  Minimum Repayment       → Closed-form math: x = (HF_target × D - C × LT) / (HF_target - LT × k)
6.  DEX Liquidity Check     → Slippage estimation for ETH→USDC swap
7.  Economic Gate           → Rescue cost < Liquidation loss × 0.90
8.  Flash Loan Sourced      → Temporary USDC liquidity (Aave V3)
9.  Debt Repaid             → USDC debt reduced on Aave
10. ETH Collateral Released → Minimum ETH withdrawn from Aave
11. ETH → USDC Swap         → DEX swap (Uniswap V3)
12. Flash Loan Repaid       → Principal + 0.05% fee
13. Post-Rescue Verify      → HF_final ≥ HF_target
14. Capital Preserved       → Position safe, user keeps maximum equity
```

**Key Principle**: The liquidity is **borrowed and repaid within the same atomic transaction**. If any step fails, the entire transaction reverts — no partial state.

---

## Core Innovation

```
ML Model          → Predicts risk (not calculates it)
+
Mathematics       → Calculates exact minimum intervention
+
Economic Engine   → Decides if rescue is worth executing
+
Flash Liquidity   → Provides temporary capital, zero upfront cost
+
DEX Execution     → ETH→USDC swap
+
Atomic Contract   → Ensures zero partial-state risk
+
Gemini AI         → Explains the decision in plain English
```

**What PRISM does NOT do:**
- Allow Gemini to calculate financial values
- Use static, arbitrary repayment amounts
- Execute rescues that cost more than they save
- Fake blockchain transactions or transaction hashes

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PRISM FRONTEND (React)                          │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────────┐│
│  │ SimulationDash. │  │ WalletDashboard  │  │  Mode: SIM/LIVE/TESTNET ││
│  │ (Always Works)  │  │ (Needs Alchemy)  │  │  Badge on every panel   ││
│  └────────┬────────┘  └────────┬─────────┘  └─────────────────────────┘│
└───────────┼────────────────────┼────────────────────────────────────────┘
            │ HTTP/REST          │
┌───────────▼────────────────────▼────────────────────────────────────────┐
│                     PRISM BACKEND (FastAPI)                              │
│                                                                          │
│  /api/v1/simulation/calculate   ← Standalone sim (no keys needed)       │
│  /api/v1/simulation/crash       ← ETH crash scenario                    │
│  /api/v1/simulation/rescue      ← Atomic rescue simulation              │
│  /api/v1/ml/predict             ← ML liquidation probability            │
│  /api/v1/dashboard/{address}    ← Full wallet dashboard                 │
│  /api/v1/rescue/simulate        ← Wallet-mode rescue simulation         │
│                                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │  Risk    │ │ Safety   │ │Interven- │ │Economics │ │  ML Model    │ │
│  │  Engine  │ │ Engine   │ │  tion    │ │  Gate    │ │  (sklearn)   │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘ │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │              External Providers (optional)                        │   │
│  │  Alchemy (ETH data) │ CoinGecko (prices) │ Gemini (explanation)  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
            │
┌───────────▼────────────────────────────────────────────────────────────┐
│                     Blockchain (optional)                               │
│  Ethereum Mainnet (read-only) │ Sepolia Testnet │ Aave V3 │ Uniswap V3 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Mathematical Formulas

### 1. Health Factor (HF)

The core DeFi solvency metric. Liquidation is triggered when HF < 1.0.

$$\text{HF} = \frac{\sum_{i} \left( \text{Collateral}_i \times \text{Price}_i \times \text{LiquidationThreshold}_i \right)}{\text{Total Debt (USD)}}$$

**Example** (default position):
- 10 ETH × \$4,000 × 82.5% = \$33,000 (collateral base)
- Debt = \$30,000 USDC
- **HF = 33,000 / 30,000 = 1.10**

**Risk Levels:**
| HF Range | Risk Level |
|----------|-----------|
| ≥ 2.0 | SAFE |
| 1.5 – 2.0 | LOW |
| 1.3 – 1.5 | MODERATE |
| 1.15 – 1.3 | HIGH_RISK |
| 1.05 – 1.15 | CRITICAL |
| < 1.0 | LIQUIDATABLE |

---

### 2. HF Velocity

Measures the rate of HF change over time — a leading indicator of deterioration:

$$\text{HF Velocity} = \frac{\Delta HF}{\Delta t} \quad \text{(per minute)}$$

**Labels:**
- < -0.05: RAPID DETERIORATION
- < -0.01: DETERIORATING
- ≈ 0: STABLE
- > 0: IMPROVING

---

### 3. PRISM Risk Score (0–100)

Multi-factor deterministic scoring:

$$\text{Risk Score} = \text{Score}_{HF} + \text{Score}_{Vol} + \text{Score}_{Concentration} + \text{Score}_{LTV}$$

- **HF Score**: 0-90 pts based on proximity to liquidation boundary
- **Volatility Score**: up to 25 pts based on weighted collateral 30d vol
- **Concentration Score**: up to 10 pts for single-asset concentration
- **LTV Score**: up to 10 pts for proximity to max LTV

---

### 4. Liquidation Probability

Sigmoid function mapping HF margin and volatility to probability:

$$P_{liq} = \frac{1}{1 + e^{6 \times \left[(HF - 1.0) - \sigma_{avg}\right]}}$$

- When HF → 1.0 and σ is high → P → 99%
- When HF > 2.0 → P → ~0%

> **Note**: ML model overrides this with a trained gradient boosting classifier during operation.

---

### 5. Dynamic Safety Buffer

PRISM does NOT use a static target HF. The target adapts to market conditions:

$$\text{Buffer}_{dyn} = \text{Base} (0.10) + \text{Adj}_{vol} + \text{Adj}_{velocity} + \text{Adj}_{liquidity}$$

$$\text{Target HF} = 1.000 + \text{Buffer}_{dyn}$$

**Adjustment Table:**

| Condition | Adjustment |
|-----------|-----------|
| Volatility > 90% | +0.20 |
| Volatility > 70% | +0.15 |
| Volatility > 50% | +0.10 |
| HF velocity < -0.10/min | +0.10 |
| HF velocity < -0.05/min | +0.07 |
| Low collateral liquidity | +0.04–0.08 |

**Result:**
- Calm market (σ < 30%): Target HF ≈ 1.10
- High volatility (σ > 70%): Target HF ≈ 1.25–1.32
- Flash crash + rapid HF drop: Target HF ≈ 1.35–1.45

---

### 6. Minimum Intervention Formula

**The most important formula in PRISM.** Solves for the minimum debt repayment `x` using the master equation:

**Variables:**
- `C` = total collateral value (USD)
- `D` = total debt value (USD)
- `LT` = liquidation threshold
- `HF_target` = target health factor
- `x` = debt to repay (USDC)
- `y` = collateral to sell (USD)
- `f_flash` = Aave flash loan fee (0.05%)
- `f_dex` = DEX swap fee (0.3%)
- `s` = estimated price slippage

**Friction factor `k`:**
$$k = \frac{1 + f_{flash}}{1 - f_{dex} - s}$$

**Collateral to sell:**
$$y = k \times x$$

**Post-rescue HF equation:**
$$\text{HF}_{target} = \frac{(C - y) \times LT}{D - x}$$

**Solving for `x`:**
$$x = \frac{\text{HF}_{target} \times D - C \times LT}{\text{HF}_{target} - LT \times k}$$

**Safety checks:**
- If numerator ≤ 0 → No intervention required
- If denominator ≤ 0 → Unsafe intervention (reject)
- Clamp: `0 ≤ x ≤ D`

**Example** (default position, -15% ETH crash):
- C = 10 × $3,400 = $34,000
- D = $30,000, LT = 0.825, HF_target = 1.32
- k = (1.0005) / (1 - 0.003 - 0.004) = 1.0076
- Numerator = 1.32 × 30,000 − 34,000 × 0.825 = 39,600 − 28,050 = 11,550
- Denominator = 1.32 − 0.825 × 1.0076 = 1.32 − 0.8313 = 0.4887
- **x = 11,550 / 0.4887 ≈ $23,633** minimum debt to repay

---

### 7. Economic Viability Gate

Before rescue, PRISM validates:

$$\text{Liquidation Loss} = \min(D \times 0.50, D) \times \text{Liq. Penalty}(5\%)$$

$$\text{Total Rescue Cost} = \text{Gas} + \text{Flash Fee} + \text{DEX Fee} + \text{Slippage}$$

$$\text{Net Benefit} = \text{Liquidation Loss} - \text{Total Rescue Cost}$$

**Decision:**
- If `Rescue Cost < Liquidation Loss × 0.90` → **RESCUE**
- Else → **DO NOT RESCUE**

---

### 8. Capital Preservation Score

PRISM's custom metric measuring how much user capital is preserved vs. liquidation:

$$\text{Score} = \left(\frac{\text{Liquidation Loss} - \text{Rescue Cost}}{\text{Liquidation Loss}}\right) \times 100$$

Range: 0–100. Higher = better capital preservation.

---

## ML Model

### Architecture
- **Algorithm**: Gradient Boosting Classifier (scikit-learn)
- **Pipeline**: StandardScaler → GradientBoostingClassifier (100 estimators, max_depth=4)
- **Training data**: 12,000 synthetic ETH/USDC position scenarios

### Features
| Feature | Description |
|---------|-------------|
| `health_factor` | Current HF (most important) |
| `eth_return_24h` | 24h ETH price return |
| `volatility_30d` | Annualized 30d realized volatility |
| `debt_ratio` | LTV (debt / collateral) |
| `distance_to_liquidation` | (HF - 1.0) / HF |
| `hf_velocity` | Rate of HF change per minute |
| `crash_magnitude` | Size of recent price drop |

### Label
`liquidated` (binary): Whether the position would be liquidated within a simulated future window, based on stochastic price projection using the 30d volatility.

### Output
```json
{
  "probability": 0.82,
  "risk_class": "CRITICAL",
  "model_type": "GradientBoosting",
  "confidence": 0.91
}
```

> **Important**: The ML model predicts risk under synthetic scenarios. It is a **scenario estimator**, not a production-grade financial forecast. All UI labels indicate "ML scenario estimate".

### Fallback
If the model is unavailable, PRISM falls back to the deterministic sigmoid formula:
$$P_{liq} = \frac{1}{1 + e^{6 \times [(HF - 1.0) - \sigma_{avg}]}}$$

---

## Gemini AI Layer

Gemini is strictly an **explanation layer**. It does NOT calculate any values.

**What Gemini receives** (structured JSON from PRISM engines):
```json
{
  "health_factor": 1.057,
  "target_hf": 1.38,
  "liquidation_probability": 0.82,
  "hf_velocity": -0.042,
  "recommended_repayment": 3585,
  "estimated_collateral": 0.94,
  "slippage": 0.0045,
  "gas_cost": 25,
  "net_benefit": 440,
  "decision": "RESCUE"
}
```

**What Gemini produces**: A 4-5 sentence human-readable summary explaining the decision in plain English.

**What Gemini does NOT do**: Invent numerical values, recalculate risk, override PRISM's deterministic decision.

**Fallback**: If Gemini is unavailable, a deterministic template explanation is generated from the same structured data.

---

## Technology Stack

### Backend
| Component | Technology |
|-----------|-----------|
| API Framework | Python 3.11 + FastAPI |
| ML Model | scikit-learn (GradientBoostingClassifier) |
| Data Processing | NumPy + Pandas |
| Blockchain | Web3.py + Alchemy JSON-RPC |
| Market Data | CoinGecko API |
| AI Explanation | Google Gemini 1.5 Flash |
| Validation | Pydantic v2 |

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | React 18 + TypeScript 5 |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS 3 |
| Charts | Recharts 2 |
| Icons | Lucide React |

### Blockchain (optional)
| Component | Technology |
|-----------|-----------|
| Wallet | MetaMask / wagmi |
| Ethereum | Alchemy (RPC + Asset API) |
| DeFi Protocol | Aave V3 |
| DEX | Uniswap V3 |
| Smart Contract | Solidity 0.8.x + Hardhat |

---

## Inputs & Outputs

### Simulation Mode Inputs (no keys required)
| Input | Default | Description |
|-------|---------|-------------|
| ETH Amount | 10 | Collateral in ETH |
| ETH Price | $4,000 | Current ETH price |
| USDC Debt | $30,000 | Total debt |
| Liquidation Threshold | 82.5% | Aave V3 ETH LT |
| Flash Fee | 0.05% | Aave flash loan fee |
| DEX Fee | 0.3% | Uniswap V3 fee tier |
| Slippage | 0.4% | Expected price impact |
| Gas (USD) | $25 | Estimated gas cost |

### Crash Simulator Inputs
| Option | Values |
|--------|--------|
| Preset crashes | -1%, -5%, -10%, -15%, -20%, -30% |
| Custom crash | Any negative percentage |

### System Outputs

**Per simulation/refresh:**
- Health Factor (calculated, not fetched)
- HF Velocity (rate of change/minute)
- Dynamic Target HF (with component breakdown)
- ML Liquidation Probability (0-100%)
- Minimum Intervention (debt_repay, ETH_to_sell, post_rescue_HF)
- Slippage Estimate
- Economic Viability (VIABLE / NOT VIABLE)
- Capital Preservation Score (0-100)
- PRISM Decision (RESCUE / ALREADY_SAFE / DO_NOT_RESCUE / EXECUTION_UNSAFE)
- Liquidator Radar (distance to liquidation %)
- Rescue vs Liquidation comparison

**Per rescue simulation:**
- 14-step animated execution timeline
- Flash loan details (amount, fee)
- ETH→USDC swap details
- Pre/post HF comparison
- Capital saved
- Rollback trigger (if any step fails)

---

## Operational Modes

### Stage 1: Simulation Mode (default — no keys needed)
Everything runs deterministically without blockchain or API keys.

```
🔷 SIMULATED  — All position data
🔷 SIMULATED  — ETH price
🟣 ML MODEL   — Real trained model
🟣 CALCULATED — All financial formulas
🟣 AI         — Gemini (if key provided)
```

### Stage 2: Live Market Mode (Alchemy + CoinGecko)
Real ETH market data, simulated Aave position.

```
🟢 LIVE       — ETH price (CoinGecko)
🟢 LIVE       — Gas price (Alchemy)
🔷 SIMULATED  — Aave position
🟣 CALCULATED — All risk engines
```

### Stage 3: Testnet Mode (Sepolia)
Real on-chain Aave position on Ethereum Sepolia.

```
🟡 TESTNET    — Aave V3 Sepolia position
🟢 LIVE       — ETH price
🟣 CALCULATED — All risk engines
❓ FALLBACK   — If protocol unavailable
```

### Stage 4: Production Architecture (post-hackathon)
Full mainnet integration with keeper bot and real atomic execution.

---

## API Reference

### Simulation Endpoints (no keys required)

#### `POST /api/v1/simulation/calculate`
Calculate all PRISM metrics for a simulated position.

**Request:**
```json
{
  "eth_amount": 10.0,
  "eth_price": 4000.0,
  "debt_usdc": 30000.0,
  "liquidation_threshold": 0.825,
  "flash_fee": 0.0005,
  "dex_fee": 0.003,
  "slippage": 0.004,
  "gas_usd": 25.0
}
```

**Response:** Full PRISM analysis including HF, velocity, ML, intervention, economics, capital score.

---

#### `POST /api/v1/simulation/crash`
Simulate an ETH price crash and recalculate all metrics.

**Request:**
```json
{
  "position": { ... same as above ... },
  "crash_pct": -15.0
}
```

**Response:** Same as calculate + `crash_applied`, `original_eth_price`, `new_eth_price`, `original_hf`.

---

#### `POST /api/v1/simulation/rescue`
Simulate a full 14-step atomic rescue execution.

**Request:** Same as calculate request.

**Response:**
```json
{
  "success": true,
  "steps": [
    { "step": 1, "name": "RISK DETECTED", "status": "DONE", "details": "HF=1.0573" },
    ...
  ],
  "original_hf": 1.0573,
  "final_hf": 1.3254,
  "target_hf": 1.32,
  "debt_repaid": 3585.22,
  "eth_sold": 0.9412,
  "rescue_cost": 45.21,
  "capital_saved": 704.79,
  "capital_preservation_score": 94.0,
  "message": "RESCUE SUCCESSFUL. HF: 1.0573 → 1.3254."
}
```

---

#### `POST /api/v1/ml/predict`
Run the ML liquidation probability model.

**Request:**
```json
{
  "health_factor": 1.057,
  "eth_return_24h": -0.15,
  "volatility_30d": 0.95,
  "debt_ratio": 0.75,
  "distance_to_liquidation": 0.054,
  "hf_velocity": -0.042,
  "crash_magnitude": 0.15
}
```

**Response:**
```json
{
  "probability": 0.82,
  "risk_class": "CRITICAL",
  "model_type": "GradientBoosting",
  "confidence": 0.91
}
```

---

### Wallet Dashboard (requires Alchemy)

#### `GET /api/v1/dashboard/{address}?demo=true&scenario=SUCCESSFUL_RESCUE`
Full aggregated PRISM analysis for a wallet address.

Parameters:
- `demo=true` — Use demo position (no real wallet needed)
- `scenario=SUCCESSFUL_RESCUE|SAFE_ABORT` — Demo scenario
- `include_explanation=true` — Generate Gemini explanation

---

### Other Endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /health` | Backend health check |
| `GET /api/v1/market/eth` | Current ETH market data |
| `POST /api/v1/rescue/simulate` | Wallet-mode rescue simulation |
| `GET /api/v1/execution/history` | Past rescue decisions |

---

## Smart Contract Architecture

### FlashRepaymentVault.sol

The production-ready Solidity contract implements the atomic rescue flow.

**Core Functions:**

```solidity
function executeFlashRepayment(
    address borrower,
    uint256 debtToRepay,
    uint256 minCollateralOut,
    uint24 poolFee,
    uint256 deadline
) external onlyKeeper nonReentrant whenNotPaused;
```

**Events Emitted:**
```solidity
event RescueInitiated(address indexed borrower, uint256 debtAmount);
event DebtRepaid(address indexed borrower, uint256 amount);
event CollateralReleased(address indexed borrower, uint256 ethAmount);
event CollateralSwapped(address indexed borrower, uint256 ethIn, uint256 usdcOut);
event FlashLoanRepaid(uint256 principal, uint256 fee);
event RescueCompleted(address indexed borrower, uint256 newHealthFactor);
event RescueReverted(address indexed borrower, string reason);
```

**Safety Features:**
- `onlyKeeper` — Only authorized keeper can trigger
- `nonReentrant` — OpenZeppelin reentrancy protection
- `whenNotPaused` — Emergency pause capability
- Slippage limits via `minCollateralOut`
- Deadline parameter for transaction freshness
- Flash loan repayment verified before commit
- Asset validation (no arbitrary token draining)

> **Current Status**: Contract exists for architecture review. Real execution requires user authorization via Aave V3's credit delegation or position transfer mechanism.

---

## Environment Variables

Create `backend/.env` (copy from `.env.example`):

```env
# ── Market Data ──────────────────────────────────────────
# Alchemy: https://dashboard.alchemy.com
ALCHEMY_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY_HERE

# CoinGecko (optional, improves rate limits)
COINGECKO_API_KEY=YOUR_COINGECKO_KEY_HERE

# ── AI Explanation ───────────────────────────────────────
# Google AI Studio: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE

# ── Testnet (Stage 3) ────────────────────────────────────
ETHEREUM_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
# WARNING: Only use testnet private keys — never mainnet
PRIVATE_KEY=YOUR_TESTNET_PRIVATE_KEY_HERE

# ── Protocol Addresses (Sepolia) ─────────────────────────
AAVE_POOL_ADDRESS=0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951
AAVE_ADDRESS_PROVIDER=0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A
AAVE_DATA_PROVIDER_ADDRESS=0x927F584d4321C1dCcBf5e2902368124b02419a1E
UNISWAP_ROUTER_ADDRESS=YOUR_UNISWAP_ROUTER_ADDRESS_HERE
UNISWAP_QUOTER_ADDRESS=YOUR_UNISWAP_QUOTER_ADDRESS_HERE
USDC_ADDRESS=0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8
WETH_ADDRESS=0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14
FLASH_LOAN_PROVIDER_ADDRESS=0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951

# ── Application ──────────────────────────────────────────
DATA_REFRESH_SECONDS=10
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

> **Security**: Never commit `.env`. Never put PRIVATE_KEY in frontend code. The `.gitignore` already excludes `.env`.

---

## Installation & Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### 1. Clone & Setup

```bash
git clone <repo>
cd prismV2
```

### 2. Backend Setup

```powershell
cd backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env with your API keys (optional for simulation mode)

# Train ML model (one-time, ~30 seconds)
python -c "from app.ml.model import train_model; train_model()"

# Start backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend Setup

```powershell
cd frontend

# Install dependencies
cmd /c "npm install"

# Start frontend (dev server)
cmd /c "npm run dev"
```

### 4. Open PRISM

Navigate to: **http://localhost:5173**

The simulation dashboard loads immediately — no API keys required.

### 5. Run Tests

```powershell
# From prismV2/ root
.\backend\venv\Scripts\python.exe -m pytest -v
```

---

## Demo Walkthrough

### The 60-Second Judge Demo

**Step 1 — Open PRISM**
- Dashboard loads immediately in Simulation Mode
- Shows: 10 ETH collateral | $30,000 USDC debt | HF = 1.10

**Step 2 — Click `-15%` ETH Crash**
- ETH: $4,000 → $3,400
- Collateral: $40,000 → $34,000
- HF: 1.10 → ~0.94 (CRITICAL)
- HF Velocity: shows negative acceleration
- ML Risk: probability spikes to ~80%+
- Dynamic Target HF: increases to ~1.32
- Notifications appear: CRITICAL RISK, ML ELEVATED

**Step 3 — Observe PRISM Intelligence**
- Target HF adapts: "High volatility + rapid deterioration"
- Minimum Intervention calculated: exact repayment amount
- Economic Gate: ✓ VIABLE (rescue cheaper than liquidation)
- Capital Preservation Score updates
- Rescue vs Liquidation comparison shows savings
- Liquidator Radar: CRITICAL pressure

**Step 4 — Click `🛡 RUN PRISM RESCUE`**
- 14-step animated timeline plays
- Shows: Flash loan sourced → Debt repaid → ETH released → Swap → Repaid
- HF: 0.94 → 1.32 (target reached)
- Capital Saved: shown in USD
- RESCUE SUCCESSFUL ✓

**Step 5 — Show Failure Case**
- Reset position to very high debt
- Shows: DO NOT RESCUE — not economically viable
- PRISM refuses to execute

---

## Interactive Dashboard Guide: Panel-by-Panel Breakdown & Value Validation

This section provides an exhaustive reference for every card, panel, and value shown on the PRISM interface, explaining **what it is**, **why we calculate it**, and **how the mathematics validates**.

---

### Panel 1: Top KPI Metric Row

#### 1. Health Factor ($HF$) Gauge
- **Value shown**: e.g., `1.100` (Initial) $\to$ `0.935` (Post-crash) $\to$ `1.200` (Post-rescue)
- **Why we have it**: $HF$ is the universal solvency metric in DeFi lending (Aave V3). If $HF < 1.000$, liquidator bots can seize up to 50% of the collateral.
- **Formula**:
  $$HF = \frac{\text{Collateral (USD)} \times \text{Liquidation Threshold (LT)}}{\text{Total Debt (USD)}} = \frac{10 \times 4000 \times 0.825}{30000} = \frac{33000}{30000} = 1.100$$
- **Visual Scale**: Color-coded progress bar with markers for Liquidation ($1.000$), Dynamic Target ($1.200$), and Safe ($3.000$).

#### 2. Health Factor Velocity ($\Delta HF / \Delta t$)
- **Value shown**: e.g., `-0.0000/min` (Stable) to `-0.0450/min` (Rapid Deterioration)
- **Why we have it**: Position risk is not static. A position at $HF = 1.15$ dropping at $0.05/\text{min}$ will be liquidated in 3 minutes, whereas a static $1.15$ position has time.
- **Formula**:
  $$\text{HF Velocity} = \frac{HF_{t} - HF_{t-\Delta t}}{\Delta t \text{ (minutes)}}$$

#### 3. ML Liquidation Risk (GradientBoosting Model)
- **Value shown**: e.g., `17.8% SAFE` $\to$ `93.5% CRITICAL`
- **Why we have it**: Captures non-linear relationships between 30d annualized volatility, 24h momentum, debt ratio, and crash velocity.
- **How we built it**: Scikit-Learn `GradientBoostingClassifier` (100 estimators, depth 4) trained on 12,000 synthetic market conditions.
- **Confidence Score**: e.g., `64%` – `95%` confidence based on distance from decision boundary.

#### 4. Liquidator Radar & Distance to Liquidation
- **Value shown**: e.g., `9.1%` (Distance) with `HIGH` pressure
- **Why we have it**: Quantifies how much ETH price can drop before liquidators strike:
  $$\text{Distance to Liquidation (\%)} = \frac{HF - 1.000}{HF} \times 100\% = \frac{1.100 - 1.000}{1.100} \times 100\% = 9.09\% \approx 9.1\%$$

---

### Panel 2: ETH/USDC Position & Crash Simulator

#### Position Overview
- **ETH Collateral**: $10.0\text{ ETH}$ @ $\$4,000 = \$40,000$
- **USDC Debt**: $\$30,000\text{ USDC}$ (LTV $= 75.0\%$)
- **Net Equity**: $\$40,000 - \$30,000 = \$10,000$
- **Liquidation Threshold**: $82.5\%$

#### ⚡ ETH Crash Simulator Buttons
- **Options**: `-1%`, `-5%`, `-10%`, `-15%`, `-20%`, `-30%`, or custom $\%$
- **What happens on click**:
  1. Recalculates ETH Price: $\$4,000 \times (1 - 0.15) = \$3,400$
  2. Collateral drops to $10 \times \$3,400 = \$34,000$
  3. $HF$ drops to $(34000 \times 0.825) / 30000 = 0.935$ (below liquidation threshold)
  4. Automatically activates rescue calculation and expands safety buffer

---

### Panel 3: Dynamic Safety Buffer ($Buffer_{dyn}$)
- **Target HF**: `1.2000`
- **Breakdown**:
  - Base Buffer: `+10%` ($0.10$)
  - Volatility Adjustment: `+10%` ($0.10$ for $65\%$ volatility)
  - Velocity Adjustment: `+0%` ($0.00$)
  - Total Target $HF = 1.000 + 0.10 + 0.10 = 1.2000$
- **Why dynamic?**: Static buffers underprotect during volatile market panics and over-repay in calm markets.

---

### Panel 4: Minimum Effective Intervention ($x^*$)
- **Debt to Repay ($x$)**: $\$8,135.18\text{ USDC}$
- **ETH to Sell ($y$ / ETH Price)**: $2.0492\text{ ETH}$ ($\$8,196.62$)
- **Fee Breakdown**:
  - Flash Loan Fee ($0.05\%$): $\$8,135.18 \times 0.0005 = \$4.0676$
  - DEX Swap Fee ($0.30\%$): $\$8,196.62 \times 0.003 = \$24.5899$
  - DEX Slippage ($0.40\%$): $\$8,196.62 \times 0.004 = \$32.7865$
- **Mathematical Proof of Post-Rescue HF**:
  $$\text{New Collateral} = \$40,000 - \$8,196.62 = \$31,803.38$$
  $$\text{New Debt} = \$30,000 - \$8,135.18 = \$21,864.82$$
  $$\text{Post-Rescue } HF = \frac{31803.38 \times 0.825}{21864.82} = \frac{26237.79}{21864.82} = \mathbf{1.2000}$$
  *(Matches the exact Target HF to 4 decimal places!)*

---

### Panel 5: Economic Viability Gate ($NetBenefit$)
- **Liquidation Loss Avoided**: $+\$750.00$
  $$\text{Liquidation Penalty} = \min(\$30,000 \times 50\%, \$30,000) \times 5\% = \$15,000 \times 0.05 = \$750.00$$
- **Total Rescue Cost**: $-\$86.44$
  $$\text{Flash Fee (\$4.07)} + \text{DEX Fee (\$24.59)} + \text{Slippage (\$32.79)} + \text{Gas (\$25.00)} = \$86.44$$
- **Net Benefit**:
  $$\text{Net Benefit} = \$750.00 - \$86.44 = \mathbf{+\$663.56}$$
- **Gate Status**: `✓ ECONOMICALLY VIABLE` ($\text{Rescue Cost} < \text{Loss} \times 0.90$)

---

### Panel 6: Capital Preservation Score
- **Score**: `88.5 / 100`
- **Calculation**:
  $$\text{Score} = \left(\frac{\$750.00 - \$86.44}{\$750.00}\right) \times 100 = \frac{663.56}{750.00} \times 100 = \mathbf{88.47\%} \approx 88.5\%$$
- **Capital Saved**: $+\$663.56$
- **Preserved Ratio**: $88.5\%$ of potential liquidation loss retained by the user.

---

### Panel 7: PRISM Rescue vs. Liquidation Side-by-Side Comparison
| Parameter | PRISM Rescue | Third-Party Liquidation |
| :--- | :--- | :--- |
| **Collateral** | $\$40,000$ | $\$40,000$ |
| **Debt** | $\$30,000$ | $\$30,000$ |
| **Intervention** | Minimum $\$8,135$ | Forced up to $50\%$ ($\$15,000$) |
| **Final HF** | $1.200$ (Safe) | Liquidated / Reduced |
| **Capital Retained** | $\mathbf{\$31,883}$ | $\$24,250$ |
| **Cost / Penalty** | $\mathbf{\$86.44}$ (Fees) | $\mathbf{\$750.00}$ (Penalty) |
| **Net Preserved** | $\mathbf{+\$663.56}$ | $\$0.00$ |

---

### Panel 8: Bottom System Activity & Alert History
- **Location**: Cleanly docked at the bottom of the dashboard.
- **Features**:
  - Real-time logging of market drops, ML risk updates, and rescue events with timestamps.
  - **Individual Dismiss Button (`×`)**: Click to remove any individual alert.
  - **Clear All Button**: Clears the entire log in one click.

---

## Failure Cases

PRISM explicitly handles and shows these cases:

### ✕ EXECUTION_UNSAFE
```
Denominator of intervention formula ≤ 0
→ No mathematically valid minimum repayment exists
→ Position structure requires manual restructuring
```

### ✕ NOT ECONOMICALLY VIABLE
```
Rescue cost > Liquidation loss × 0.90
→ Saving the position costs more than the penalty
→ PRISM aborts to preserve user funds
```

### ✕ TRANSACTION REVERTED
```
Post-rescue HF < Target HF × 0.95
→ Slippage or market movement invalidated rescue
→ Full rollback — position unchanged
```

### ✕ NO INTERVENTION REQUIRED
```
Current HF ≥ Target HF
→ Position is already safe
→ PRISM continues monitoring
```

---

## Security Model

### Current (Hackathon Demo)
- **Read-only**: No private keys, no wallet permissions, no real transactions
- **Simulation**: All rescue operations happen in memory
- **No fake confirmations**: Simulation is labeled "SIMULATED" everywhere
- **No fake tx hashes**: We don't generate fake blockchain receipts

### Smart Contract Safety (Production)
- `onlyKeeper` authorization
- `nonReentrant` via OpenZeppelin
- Emergency `pause()` function
- Slippage protection via `minOut` parameter
- `deadline` for transaction freshness
- No arbitrary token drain functions
- Explicit authorized borrower address

### API Security
- CORS restricted to known origins
- No private keys in environment variables exposed to frontend
- All financial calculations in backend — frontend is display-only

---

## Limitations & Disclaimers

1. **Simulation data is synthetic** — Position, ETH price, and Aave state are simulated
2. **ML model is trained on synthetic scenarios** — Not production-grade financial forecasting
3. **No real blockchain transactions** in demo mode
4. **Flash loans require atomic execution** — Gas costs in real production are higher than estimated
5. **Slippage model is simplified** — Real DEX slippage depends on pool depth at time of execution
6. **Aave testnet availability** — Some Sepolia pools may have limited liquidity
7. **Gemini explains decisions** — It does not make decisions or calculate values

---

## Future Roadmap

| Feature | Status |
|---------|--------|
| Simulation Mode | ✅ Complete |
| Live ETH Market | ✅ Complete |
| Wallet Dashboard (Aave on-chain) | ✅ Complete |
| ML Model | ✅ Complete |
| Gemini Explanation | ✅ Complete |
| Smart Contract (Solidity) | ✅ Architecture done |
| Testnet Integration (Sepolia) | 🔄 Adapter ready |
| Real Aave Credit Delegation | 📅 Post-hackathon |
| Mainnet Keeper Bot | 📅 Post-hackathon |
| Cross-chain (Arbitrum, Base) | 📅 Post-hackathon |
| Multi-protocol (Morpho, Spark) | 📅 Post-hackathon |
| MEV Protection (Flashbots) | 📅 Post-hackathon |
| Monte Carlo Simulation | 📅 Post-hackathon |

---

## Project Structure

```
prismV2/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── dashboard.py    # Full wallet dashboard aggregator
│   │   │       ├── simulation.py   # Standalone simulation endpoints
│   │   │       ├── ml.py           # ML prediction endpoint
│   │   │       ├── rescue.py       # Rescue simulation (wallet mode)
│   │   │       └── ...             # Other API routes
│   │   ├── ml/
│   │   │   ├── model.py            # Gradient Boosting classifier
│   │   │   ├── generate_dataset.py # Synthetic training data generator
│   │   │   └── train.py            # Training script
│   │   ├── services/
│   │   │   ├── risk_engine.py      # HF + liquidation probability
│   │   │   ├── safety_engine.py    # Dynamic safety buffer
│   │   │   ├── intervention_engine.py # Minimum repayment formula
│   │   │   ├── economics_engine.py # Economic viability gate
│   │   │   ├── rescue_simulator.py # Atomic rescue simulation
│   │   │   ├── strategy_engine.py  # 4-way strategy comparison
│   │   │   ├── llm_service.py      # Gemini explanation layer
│   │   │   ├── market_service.py   # CoinGecko price feed
│   │   │   └── defi_service.py     # Aave V3 on-chain discovery
│   │   ├── providers/
│   │   │   ├── alchemy_provider.py # Alchemy RPC + token API
│   │   │   ├── aave_provider.py    # Aave V3 contract calls
│   │   │   └── coingecko_provider.py # Price feed
│   │   ├── models/                 # Pydantic data models
│   │   ├── config.py               # Settings (env vars)
│   │   └── main.py                 # FastAPI application
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── SimulationDashboard.tsx  # PRIMARY DEMO — standalone sim
│       │   ├── Header.tsx
│       │   ├── RescueSimulationModal.tsx
│       │   └── ...                      # Other wallet-mode components
│       ├── services/api.ts
│       ├── types/index.ts
│       ├── App.tsx                       # Mode router (sim/wallet)
│       └── main.tsx
│
├── contracts/
│   ├── FlashRepaymentVault.sol  # Atomic rescue smart contract
│   └── interfaces/              # Protocol interfaces
│
├── .env.example
├── .gitignore
└── README.md                    # This file
```

---

*PRISM — Autonomous Liquidation Shield*
*Predict. Protect. Preserve.*
*Built for the Google DeepMind Hackathon 2026*

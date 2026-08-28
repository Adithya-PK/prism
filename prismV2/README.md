# PRISM
### **Predictive Risk Intelligence & Smart Protection for DeFi**
> *Tagline: Predict. Protect. Preserve.*

---

## 1. Executive Summary & Core Purpose
> **CSI ORIGIN 2026 Problem Statement #11 Solution**: *Automated Liquidation Shield & Flash-Repayment Vault*

### The Problem in DeFi Lending
In overcollateralized DeFi protocols like Aave, Compound, MakerDAO, and Morpho, users deposit collateral (ETH, WBTC, wstETH) to borrow stablecoins or other crypto assets (USDC, USDT, DAI). 

When market prices drop, the ratio of collateral value to debt deteriorates. If the **Health Factor ($HF$)** falls below **$1.000$**, the protocol declares the position insolvent and triggers an **on-chain liquidation**:
1. **Third-party liquidator bots** immediately seize up to 50% of the collateral at a discounted rate.
2. The user is penalized with an immediate **$5\% \text{ to } 15\%$ liquidation penalty fee**.
3. Gas wars and MEV frontrunning exacerbate market dumping and price slippage.
4. **Human users cannot react fast enough**: Liquidations often happen at 3:00 AM or during flash crashes in seconds.

### How PRISM Solves This
**PRISM** is an autonomous risk-management engine designed to continuously monitor a user's wallet and DeFi positions, predict future risk *before* liquidation occurs, dynamically expand safety buffers during high market volatility, solve the **exact minimum capital intervention** needed to restore safety, evaluate whole-wallet collateral options, compare 4 distinct rescue strategies, verify economic viability (ensuring rescue cost is strictly lower than potential liquidation loss), and explain every decision via Gemini AI.

---

## 2. What Makes PRISM Different?

| Conventional Approach | PRISM Autonomous Engine |
| :--- | :--- |
| **Static Calculators**: Require manual entry of hypothetical numbers. | **Live Blockchain Connection**: Discovers real ERC-20 balances, on-chain Aave positions, and live CoinGecko prices. |
| **Reactive Alerts**: Notifies you *after* you are already in the liquidation zone. | **Predictive Intelligence**: Projects Health Factor $1\text{--}4\text{h}$ ahead using annualized volatility and 24h momentum. |
| **Arbitrary Fixed Repayments**: Suggests blunt rules like "repay 25% of debt". | **Minimum Intervention Engine**: Uses closed-form optimization to solve the exact minimum capital required. |
| **Single-Asset Assumptions**: Assumes the user will just pay with ETH. | **Whole-Wallet Collateral Optimizer**: Multi-factor scoring across all wallet tokens for liquidity, volatility, and slippage. |
| **Rescue at Any Cost**: Tries to rescue even when gas and slippage exceed the liquidation penalty. | **Economic Viability Engine**: Strictly enforces $Rescue Cost < Liquidation Penalty$ before execution. |
| **AI Hallucinations**: Lets LLMs calculate mathematical risk numbers. | **Strict Architectural Separation**: Deterministic engines calculate all numbers; Gemini only translates results into human explanations. |
| **Risky Fund Execution**: Requires private keys and risky smart contract custody. | **Read-Only Safety**: Strictly read-only on live blockchain. All rescue operations are simulated in atomic sandboxes. |

---

## 3. Chronological Flow of Operations

```
Step 1: User enters Public Wallet Address (0x...)
   │
   ▼
Step 2: Alchemy JSON-RPC & CoinGecko Pipeline
   ├── Queries native ETH and all ERC-20 token balances
   ├── Fetches live USD prices, 24h changes, and 30-day volatility
   └── Reads on-chain Aave V3 Pool & Data Provider contracts
   │
   ▼
Step 3: Data Normalization
   └── Builds normalized WalletData and DeFiPosition models
   │
   ▼
Step 4: PRISM Risk Engine
   └── Calculates deterministic Risk Score (0-100) and Liquidation Probability
   │
   ▼
Step 5: PRISM Predictive Engine
   └── Projects future Health Factor trajectory based on volatility and momentum
   │
   ▼
Step 6: PRISM Dynamic Safety Engine
   └── Computes adaptive buffer (Base + Volatility + Trend + Liquidity adjustments)
   │
   ▼
Step 7: PRISM Minimum Intervention Engine
   └── Solves the exact minimal capital needed to achieve Target Health Factor
   │
   ▼
Step 8: Whole-Wallet Collateral Optimizer
   └── Scores candidate collateral assets by liquidity, volatility, and slippage
   │
   ▼
Step 9: Strategy Comparison Engine
   └── Evaluates 4 simulated strategies: Direct Repay, Collateral Swap, Flash Rescue, No Action
   │
   ▼
Step 10: Economic Viability Engine
   └── Compares total rescue cost against potential liquidation loss
   │
   ▼
Step 11: Pre-Execution Safety Gate
   └── Validates 9 strict invariant checks (slippage, leverage, buffer, post-HF)
   │
   ▼
Step 12: Decision Matrix [ MONITOR / RESCUE / ABORT ]
   │
   ▼
Step 13: Simulated Atomic Rescue Execution
   └── 9-step atomic execution trace (with automated rollback if any step fails)
   │
   ▼
Step 14: Gemini AI Explainability Layer
   └── Synthesizes deterministic data into human-readable executive briefing
```

---

## 4. Mathematical Formulas & Engine Specifications

### 1. Health Factor ($HF$)
Measures the solvency of an overcollateralized position. Liquidation is triggered when $HF < 1.000$.

$$\text{Health Factor} = \frac{\sum_{i} \left( \text{Collateral Amount}_i \times \text{Price}_i \times \text{Liquidation Threshold}_i \right)}{\text{Total Debt Value (USD)}}$$

- **Example**: If collateral is $3.5\text{ WETH}$ ($\$2,800$, $LT = 82.5\%$) and $\$0.05\text{ WBTC}$ ($\$65,000$, $LT = 70.0\%$), and total debt is $\$8,200\text{ USDC}$:
  $$\text{Collateral Base} = (3.5 \times 2800 \times 0.825) + (0.05 \times 65000 \times 0.70) = 8085 + 2275 = \$10,360$$
  $$HF = \frac{10360}{8200} = 1.263$$

---

### 2. PRISM Risk Score & Liquidation Probability ($P_{liq}$)
Quantifies total risk on a $0\text{--}100$ scale combining Health Factor proximity, weighted collateral volatility, concentration risk, and LTV ratio.

$$\text{Risk Score} = \text{Score}_{HF} + \text{Score}_{Vol} + \text{Score}_{Concentration} + \text{Score}_{LTV}$$

$$\text{Liquidation Probability } P_{liq} = \frac{1}{1 + e^{6 \times \left( (HF - 1.0) - \sigma_{avg} \right)}}$$

- When $HF \to 1.0$ and volatility is high, $P_{liq} \to 99\%$.
- When $HF > 2.0$, $P_{liq} \to 0\%$.

---

### 3. Predictive Health Factor Trajectory
Projects the Health Factor $h$ hours into the future using annualized 30-day volatility scaled to the time horizon and 24h price momentum:

$$\sigma_h = \frac{\sigma_{30d}}{\sqrt{365}} \times \sqrt{\frac{h}{24}}$$

$$\Delta \text{Collateral} = \left( \text{Trend}_{24h} \times \frac{h}{24} \right) - \sigma_h$$

$$\text{Projected HF} = \frac{\text{Collateral} \times (1 + \Delta \text{Collateral}) \times LT_{weighted}}{\text{Debt}}$$

---

### 4. Dynamic Safety Buffer ($Buffer_{dyn}$)
Rather than targeting the bare minimum $1.000$, PRISM dynamically expands the safety margin when market conditions deteriorate:

$$\text{Buffer}_{dyn} = \text{Base Buffer } (0.10) + \text{Adj}_{vol} + \text{Adj}_{trend} + \text{Adj}_{liquidity}$$

$$\text{Target Health Factor} = 1.000 + \text{Buffer}_{dyn}$$

- **Calm market** ($\sigma < 30\%$): Target $HF = 1.100$
- **High volatility** ($\sigma > 70\%$): Target $HF = 1.200$
- **Severe crash** ($\sigma > 90\%$, negative trend): Target $HF = 1.300+$

---

### 5. Minimum Effective Intervention ($Repay^*$)
Calculates the exact smallest amount of debt that must be repaid to restore the position to the $\text{Target HF}$:

$$\text{Target HF} = \frac{\text{Total Collateral} \times LT}{\text{Total Debt} - Repay^*}$$

$$Repay^* = \text{Total Debt} - \frac{\text{Total Collateral} \times LT}{\text{Target HF}}$$

---

### 6. Whole-Wallet Collateral Optimizer Scoring
When selecting which asset to use for debt repayment or swap, PRISM scores each candidate asset deterministically:

$$\text{Score}_i = 40 \times \text{Liquidity}_i + 30 \times (1 - \sigma_i) + 20 \times (1 - \text{Slippage}_i) + 10 \times (1 - \text{Concentration}_i)$$

The asset with the highest score is chosen as the optimal rescue asset.

---

### 7. Rescue Strategies Evaluated

| Strategy | Capital Source | Estimated Cost Formula | Post-HF |
| :--- | :--- | :--- | :--- |
| **1. Direct Debt Repayment** | User Wallet | $\text{Repay} \times \text{Slip}_{direct} + \text{Gas}_{repay}$ | $\frac{Col \times LT}{Debt - Repay}$ |
| **2. Collateral Swap** | Position Collateral | $\text{Repay} \times \text{Slip}_{swap} + \text{Gas}_{swap}$ | $\frac{Col \times LT}{Debt - Repay_{eff}}$ |
| **3. Flash Liquidity Rescue** | Aave V3 Flash Loan | $\text{Repay} \times 0.05\% + \text{Slip} + \text{Gas}_{flash}$ | $\frac{Col \times LT}{Debt - Repay_{eff}}$ |
| **4. No Action** | None | $\$0.00$ | $HF_{current}$ |

---

### 8. Economic Viability Engine ($Net Benefit$)
Ensures a rescue is never executed if the cost of rescue exceeds the penalty of liquidation:

$$\text{Estimated Liquidation Loss} = \min(\text{Debt} \times 50\%, \text{Debt}) \times \text{Liquidation Penalty } (5\%)$$

$$\text{Total Rescue Cost} = \text{Swap Fees} + \text{Slippage Cost} + \text{Estimated Gas} + \text{Flash Fee}$$

$$\text{Net Preserved Value} = \text{Liquidation Loss} - \text{Total Rescue Cost}$$

- If $\text{Total Rescue Cost} < \text{Liquidation Loss} \times 0.80 \implies \mathbf{RESCUE}$
- If $\text{Total Rescue Cost} \ge \text{Liquidation Loss} \implies \mathbf{ABORT}$

---

### 9. Pre-Execution Safety Gate Checklist
Before any simulated atomic rescue is executed, 9 invariant checks must pass:
1. `Target HF achievable`: Post-HF $\ge \text{Target HF} \times 0.95$
2. `Minimum intervention calculated`: $Repay^* > 0$
3. `Sufficient collateral liquidity`: Liquidity Score $\ge 0.50$
4. `Slippage acceptable`: Max Slippage $\le 5.0\%$
5. `Rescue cost acceptable`: Rescue Cost $< 10\%$ of total debt
6. `Safety buffer maintained`: Target HF $> 1.000$
7. `Post-rescue HF safe`: Post-HF $> 1.000$
8. `No excessive leverage`: Current LTV $\le \text{Max LTV} \times 1.10$
9. `Simulation parameters valid`: Viable strategy selected

---

### 10. 9-Step Atomic Simulated Execution with Rollback

```
Step 1: Evaluate current position health and debt parameters
Step 2: Calculate minimum effective intervention amount
Step 3: Simulate temporary liquidity acquisition (Flash loan or internal release)
Step 4: Simulate debt repayment on lending pool
Step 5: Simulate collateral release
Step 6: Simulate collateral swap to debt asset
Step 7: Simulate temporary liquidity repayment + fee
Step 8: Verify final post-rescue Health Factor (Post-HF >= Target HF)
Step 9: Commit simulated state (or ROLLBACK if verification fails)
```

---

## 5. Technology Stack

### Backend
- **Python 3.11 / 3.12 / 3.13**
- **FastAPI**: Asynchronous high-performance REST API
- **Web3.py**: Ethereum on-chain smart contract interaction
- **Alchemy JSON-RPC**: High-throughput Ethereum node provider & ERC-20 token indexer
- **CoinGecko API**: Real-time market prices, historical OHLCV charts, volatility modeling
- **Google Gemini 1.5 Flash**: AI synthesis & explainability layer
- **Pydantic v2**: Strict schema validation & serialization
- **Pytest**: Automated engine verification suite

### Frontend
- **React 18**: Component-driven UI architecture
- **TypeScript 5**: Type-safe domain models
- **Vite 5**: Optimized developer server & build pipeline
- **Tailwind CSS 3**: Dark institutional terminal styling
- **Recharts**: Interactive trajectory charts with reference lines
- **Lucide Icons**: Institutional iconography

---

## 6. Inputs and Outputs Specification

### Inputs
- **Public Wallet Address**: Any valid 42-character Ethereum hex string (`0x...`).
- **Autonomous Protection Mode**: `ON` / `OFF` toggle.
- **Demo Scenario Selector**: `SUCCESSFUL_RESCUE` or `SAFE_ABORT`.

### Outputs
- **Whole Wallet Summary**: Native ETH balance, ERC-20 token table, USD prices, 24h change, portfolio % allocation.
- **DeFi Position Metrics**: Collateral assets, borrow assets, current LTV, Liquidation Threshold, Liquidation Penalty, Health Factor.
- **Risk Assessment**: Deterministic Risk Score ($0\text{--}100$), Risk Level (`SAFE`, `MODERATE`, `HIGH`, `CRITICAL`), Liquidation Probability.
- **Predictive Trajectory**: Projected Health Factor over short-term horizon with confidence interval.
- **Dynamic Safety Buffer**: Adaptive margin breakdown + Gemini natural language rationale.
- **Minimum Intervention**: Exact dollar amount and token units required.
- **Strategy Cards**: Comparison of 4 strategies with capital, cost, slippage, gas, and post-HF.
- **Economic Evaluation**: Rescue cost breakdown, liquidation loss avoided, net value preserved.
- **Safety Gate Results**: 9-point invariant checklist.
- **Simulation Trace**: Step-by-step 9-stage atomic transaction execution log.
- **AI Explanation**: Executive summary written by Gemini 1.5 Flash.

---

## 7. Current Features (MVP) vs Future Roadmap

### Features Live in this MVP:
- Real-time whole wallet discovery (native ETH + ERC-20 tokens).
- Live market prices, 24h changes, volatility, and Ethereum gas price tracking.
- Live on-chain Aave V3 position discovery via Web3 contract calls.
- Deterministic multi-factor Risk Engine.
- Short-term predictive Health Factor forecasting.
- Dynamic market-adaptive safety buffer calculation.
- Minimum capital intervention optimization.
- Whole-wallet collateral candidate evaluation.
- 4-way rescue strategy simulation & comparison.
- Economic viability & loss avoidance engine.
- 9-check pre-execution safety gate.
- 9-step atomic rescue simulation with automated rollback.
- Gemini AI decision explanation with deterministic fallback.
- Dual demo scenarios (Successful Rescue & Safe Abort) for judges.
- Read-only security model (no private keys, no signatures).

### Future Roadmap (Post-Hackathon):
- **Cross-Chain Expansion**: Arbitrum, Optimism, Base, Polygon, and Avalanche.
- **Multi-Protocol Aggregation**: MakerDAO (Sky), Morpho Blue, Compound V3, Spark Protocol.
- **Account Abstraction (ERC-4337)**: Optional user-authorized smart contracts for automated autonomous execution.
- **MEV Protection**: Private transaction routing via Flashbots / MEV-Share to prevent frontrunning.
- **Institutional Portfolio Risk**: Multi-wallet stress testing and Monte Carlo liquidation simulations.

---

## 8. Installation & Quick Start

### 1. Configure Environment
Create `backend/.env` from `.env.example`:
```env
ALCHEMY_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
GEMINI_API_KEY=YOUR_GEMINI_KEY
DATA_REFRESH_SECONDS=10
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 2. Install & Start Backend
```powershell
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Install & Start Frontend
```powershell
cd frontend
npm install
cmd /c "npm run dev"
```

### 4. Run Automated Tests
```powershell
pytest -v
```
*(All 15 unit and integration tests will run and pass).*

---

*PRISM • Predict. Protect. Preserve. • Developed for the Google Gemini / DeFi Agentic Hackathon*

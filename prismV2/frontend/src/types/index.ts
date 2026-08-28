export interface DataSource {
  name: string;
  type: 'LIVE' | 'ESTIMATED' | 'SIMULATED';
  provider?: string;
}

export interface TokenBalance {
  symbol: string;
  name: string;
  contract_address?: string;
  decimals: number;
  balance: number;
  price_usd?: number;
  value_usd?: number;
  price_change_24h?: number;
  allocation_pct?: number;
  logo_url?: string;
  is_native: boolean;
  source: DataSource;
}

export interface WalletData {
  address: string;
  network: string;
  chain_id: number;
  block_number?: number;
  eth_balance: number;
  tokens: TokenBalance[];
  total_portfolio_value_usd: number;
  nft_count?: number;
  last_updated?: string;
  source: DataSource;
}

export interface AssetPrice {
  symbol: string;
  name?: string;
  price_usd: number;
  price_change_24h?: number;
  volume_24h_usd?: number;
  market_cap_usd?: number;
  volatility_30d?: number;
  trend?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  last_updated?: string;
  source: DataSource;
}

export interface MarketData {
  prices: Record<string, AssetPrice>;
  network_gas_price_gwei?: number;
  eth_block_number?: number;
  last_updated?: string;
  source: DataSource;
}

export interface CollateralAsset {
  symbol: string;
  name: string;
  contract_address?: string;
  balance: number;
  price_usd: number;
  value_usd: number;
  liquidation_threshold: number;
  loan_to_value: number;
  liquidation_penalty: number;
  volatility_30d?: number;
  liquidity_score: number;
  can_be_collateral: boolean;
}

export interface DebtAsset {
  symbol: string;
  name: string;
  contract_address?: string;
  balance: number;
  price_usd: number;
  value_usd: number;
  borrow_rate?: number;
}

export interface DeFiPosition {
  protocol: string;
  chain: string;
  chain_id: number;
  address: string;
  collateral_assets: CollateralAsset[];
  debt_assets: DebtAsset[];
  total_collateral_value_usd: number;
  total_debt_value_usd: number;
  net_value_usd: number;
  health_factor: number;
  current_ltv: number;
  liquidation_threshold: number;
  max_ltv: number;
  liquidation_penalty: number;
  is_live: boolean;
  source: DataSource;
  last_updated?: string;
}

export type RiskLevel = 'SAFE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type DecisionType = 'MONITOR' | 'RESCUE' | 'ABORT';

export interface RiskAssessment {
  risk_score: number;
  risk_level: RiskLevel;
  liquidation_probability: number;
  risk_factors: string[];
  health_factor: number;
  collateral_value: number;
  debt_value: number;
  liquidation_threshold: number;
  current_ltv: number;
  source: DataSource;
}

export interface PredictiveRisk {
  current_health_factor: number;
  predicted_health_factor: number;
  liquidation_probability: number;
  prediction_horizon: string;
  confidence: number;
  scenario_description: string;
  volatility_factor: number;
  trend_factor: number;
  source: DataSource;
}

export interface SafetyBuffer {
  base_buffer: number;
  volatility_adjustment: number;
  trend_adjustment: number;
  liquidity_adjustment: number;
  dynamic_safety_buffer: number;
  liquidation_boundary: number;
  target_health_factor: number;
  explanation: string;
  source: DataSource;
}

export interface CollateralCandidate {
  symbol: string;
  value_usd: number;
  volatility: number;
  liquidity_score: number;
  estimated_slippage: number;
  concentration_pct: number;
  execution_score: number;
  estimated_post_hf?: number;
  capital_consumed?: number;
  selected: boolean;
  reason?: string;
}

export interface InterventionPlan {
  required: boolean;
  minimum_intervention_usd: number;
  selected_asset: string;
  selected_amount: number;
  selected_amount_usd: number;
  current_health_factor: number;
  target_health_factor: number;
  estimated_post_health_factor: number;
  collateral_candidates: CollateralCandidate[];
  source: DataSource;
}

export interface Strategy {
  name: string;
  type: 'DIRECT_REPAY' | 'COLLATERAL_SWAP' | 'FLASH_RESCUE' | 'NO_ACTION';
  required_capital_usd: number;
  estimated_cost_usd: number;
  estimated_slippage_pct: number;
  estimated_gas_usd: number;
  post_health_factor: number;
  risk_level: string;
  economic_benefit_usd: number;
  status: 'VIABLE' | 'UNSAFE' | 'INSUFFICIENT_LIQUIDITY' | 'UNECONOMICAL' | 'SELECTED';
  is_selected: boolean;
}

export interface EconomicsResult {
  swap_fees_usd: number;
  slippage_cost_usd: number;
  estimated_gas_usd: number;
  liquidity_fee_usd: number;
  total_rescue_cost_usd: number;
  estimated_liquidation_loss_usd: number;
  potential_loss_avoided_usd: number;
  net_benefit_usd: number;
  economic_decision: DecisionType;
  decision_reason: string;
  source: DataSource;
}

export interface SafetyCheck {
  name: string;
  passed: boolean;
  details: string;
}

export interface SafetyGateResult {
  all_passed: boolean;
  checks: SafetyCheck[];
  blocking_check?: string;
}

export interface RescueStep {
  step: number;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | 'ROLLED_BACK';
  details?: string;
}

export interface RescueResult {
  success: boolean;
  simulated: boolean;
  steps: RescueStep[];
  original_health_factor: number;
  final_health_factor: number;
  position_changed: boolean;
  rollback_triggered: boolean;
  rollback_reason?: string;
  message: string;
}

export interface ActivityItem {
  time: string;
  message: string;
}

export interface DashboardResponse {
  mode: 'LIVE' | 'DEMO';
  network: string;
  timestamp: string;
  wallet?: WalletData;
  wallet_error?: string;
  portfolio?: {
    total_value_usd: number;
    token_count: number;
  };
  market?: MarketData;
  defi_position?: DeFiPosition;
  defi_position_source: string;
  defi_error?: string;
  has_position: boolean;
  risk?: RiskAssessment;
  prediction?: PredictiveRisk;
  safety?: SafetyBuffer;
  intervention?: InterventionPlan;
  strategies: Strategy[];
  economics?: EconomicsResult;
  safety_gate?: SafetyGateResult;
  decision: DecisionType;
  explanation?: string;
  explanation_source?: string;
  activity: ActivityItem[];
  data_sources: Record<string, string>;
}

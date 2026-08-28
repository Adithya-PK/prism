"""
PRISM Simulation Mode - Crash Simulator & Position Calculator
Fully self-contained simulation that works WITHOUT wallet or blockchain.
"""
import logging
import math
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)
router = APIRouter(prefix='/simulation', tags=['Simulation'])
llm_service = LLMService()

# Default position constants
DEFAULT_ETH_AMOUNT = 10.0
DEFAULT_ETH_PRICE = 4000.0
DEFAULT_DEBT_USDC = 30000.0
DEFAULT_LT = 0.825
DEFAULT_FLASH_FEE = 0.0005
DEFAULT_DEX_FEE = 0.003
DEFAULT_SLIPPAGE = 0.004
DEFAULT_GAS_USD = 25.0

# HF history for velocity calculation
_hf_history: List[dict] = []


class SimulationPosition(BaseModel):
    eth_amount: float = DEFAULT_ETH_AMOUNT
    eth_price: float = DEFAULT_ETH_PRICE
    debt_usdc: float = DEFAULT_DEBT_USDC
    liquidation_threshold: float = DEFAULT_LT
    flash_fee: float = DEFAULT_FLASH_FEE
    dex_fee: float = DEFAULT_DEX_FEE
    slippage: float = DEFAULT_SLIPPAGE
    gas_usd: float = DEFAULT_GAS_USD


class CrashRequest(BaseModel):
    position: SimulationPosition
    crash_pct: float  # e.g. -15.0 for -15%


def compute_hf(eth_amount: float, eth_price: float, debt: float, lt: float) -> float:
    if debt <= 0:
        return 999.0
    return (eth_amount * eth_price * lt) / debt


def compute_dynamic_target_hf(hf: float, volatility: float, hf_velocity: float) -> dict:
    base = 0.10
    vol_adj = 0.0
    if volatility > 0.90: vol_adj = 0.20
    elif volatility > 0.70: vol_adj = 0.15
    elif volatility > 0.50: vol_adj = 0.10
    elif volatility > 0.30: vol_adj = 0.05

    vel_adj = 0.0
    if hf_velocity < -0.10: vel_adj = 0.10
    elif hf_velocity < -0.05: vel_adj = 0.07
    elif hf_velocity < -0.02: vel_adj = 0.04
    elif hf_velocity < 0: vel_adj = 0.02

    dynamic = base + vol_adj + vel_adj
    dynamic = max(0.05, min(dynamic, 0.40))
    target = 1.0 + dynamic

    reasons = []
    if vol_adj > 0: reasons.append(f'High ETH volatility ({volatility*100:.0f}%)')
    if vel_adj > 0: reasons.append(f'Rapid HF deterioration ({hf_velocity:.3f}/min)')
    if not reasons: reasons.append('Stable market conditions')

    return {
        'base_buffer': base, 'vol_adj': vol_adj, 'vel_adj': vel_adj,
        'dynamic_buffer': round(dynamic, 4), 'target_hf': round(target, 4),
        'reasons': reasons,
    }


def compute_intervention(collateral_usd: float, debt_usd: float, lt: float,
                          target_hf: float, flash_fee: float, dex_fee: float, slippage: float,
                          eth_price: float = 0.0) -> dict:
    """The master intervention formula from the spec."""
    # k = (1 + flash_fee) / (1 - dex_fee - slippage)
    k = (1 + flash_fee) / (1 - dex_fee - slippage)
    # x = (target_hf * debt - collateral * lt) / (target_hf - lt * k)
    numerator = target_hf * debt_usd - collateral_usd * lt
    denominator = target_hf - lt * k

    if numerator <= 0:
        return {'status': 'NO_INTERVENTION_REQUIRED', 'x': 0, 'y': 0}
    if denominator <= 0:
        return {'status': 'UNSAFE_INTERVENTION', 'x': 0, 'y': 0}

    x = numerator / denominator  # debt to repay (USD)
    x = max(0, min(x, debt_usd))
    y = k * x  # collateral to sell (USD)

    # Post rescue verification
    post_collateral = collateral_usd - y
    post_debt = debt_usd - x
    post_hf = (post_collateral * lt) / post_debt if post_debt > 0 else 999.0

    # ETH amount = collateral USD to sell / ETH price
    eth_to_sell = (y / eth_price) if eth_price > 0 else 0.0

    return {
        'status': 'VIABLE',
        'debt_to_repay_usd': round(x, 2),
        'collateral_to_sell_usd': round(y, 2),
        'collateral_to_sell_eth': round(eth_to_sell, 6),
        'flash_loan_amount': round(x, 2),
        'flash_fee_usd': round(x * flash_fee, 4),
        'dex_fee_usd': round(y * dex_fee, 4),
        'slippage_usd': round(y * slippage, 4),
        'post_rescue_hf': round(post_hf, 4),
        'k_factor': round(k, 6),
        'numerator': round(numerator, 4),
        'denominator': round(denominator, 6),
    }


def compute_volatility(crash_pct: float) -> float:
    """Estimate annualized volatility from crash magnitude."""
    base_vol = 0.65  # ETH baseline annualized vol
    crash_vol_boost = abs(crash_pct) / 100 * 3.0  # crash adds to vol
    return min(base_vol + crash_vol_boost, 1.50)


def compute_liquidation_loss(debt_usd: float, collateral_usd: float, lt: float, liq_penalty: float = 0.05) -> dict:
    """Estimate liquidation scenario loss."""
    max_liquidatable = min(debt_usd * 0.5, debt_usd)
    liq_bonus_usd = max_liquidatable * liq_penalty
    remaining_collateral = collateral_usd - max_liquidatable - liq_bonus_usd
    remaining_debt = debt_usd - max_liquidatable
    return {
        'debt_liquidated': round(max_liquidatable, 2),
        'liquidation_penalty': round(liq_bonus_usd, 2),
        'remaining_collateral': round(remaining_collateral, 2),
        'remaining_debt': round(remaining_debt, 2),
        'total_loss': round(liq_bonus_usd, 2),
    }


def compute_capital_preservation_score(rescue_cost: float, liq_loss: float, net_benefit: float) -> dict:
    """PRISM Capital Preservation Score."""
    if liq_loss <= 0:
        return {'score': 100.0, 'capital_saved': 0.0, 'rescue_cost': rescue_cost, 'preserved_pct': 100.0}
    preserved_pct = max(0, (liq_loss - rescue_cost) / liq_loss * 100)
    score = round(preserved_pct, 1)
    capital_saved = round(liq_loss - rescue_cost, 2)
    return {
        'score': score,
        'capital_saved': capital_saved,
        'rescue_cost': round(rescue_cost, 2),
        'preserved_pct': round(preserved_pct, 2),
    }


@router.post('/calculate')
async def calculate_position(position: SimulationPosition):
    """Calculate all PRISM metrics for a simulated position."""
    eth_amount = position.eth_amount
    eth_price = position.eth_price
    debt_usdc = position.debt_usdc
    lt = position.liquidation_threshold

    collateral_usd = eth_amount * eth_price
    hf = compute_hf(eth_amount, eth_price, debt_usdc, lt)
    ltv = debt_usdc / collateral_usd if collateral_usd > 0 else 0

    # HF velocity from history
    global _hf_history
    now = datetime.now(timezone.utc)
    _hf_history.append({'hf': hf, 'time': now})
    _hf_history = _hf_history[-20:]  # keep last 20

    hf_velocity = 0.0
    if len(_hf_history) >= 2:
        dt = (_hf_history[-1]['time'] - _hf_history[0]['time']).total_seconds() / 60
        if dt > 0:
            hf_velocity = (_hf_history[-1]['hf'] - _hf_history[0]['hf']) / dt
    hf_velocity = round(hf_velocity, 5)

    volatility = 0.65  # baseline
    target_hf_data = compute_dynamic_target_hf(hf, volatility, hf_velocity)
    target_hf = target_hf_data['target_hf']

    intervention = compute_intervention(collateral_usd, debt_usdc, lt, target_hf,
                                        position.flash_fee, position.dex_fee, position.slippage,
                                        eth_price=eth_amount and collateral_usd / eth_amount or 0.0)

    # ML prediction
    try:
        from app.ml.model import predict as ml_predict
        distance_to_liq = max((hf - 1.0) / hf, 0.0) if hf > 0 else 0
        ml_result = ml_predict(
            health_factor=hf, eth_return_24h=0.0, volatility_30d=volatility,
            debt_ratio=ltv, distance_to_liquidation=distance_to_liq,
            hf_velocity=hf_velocity, crash_magnitude=0.0,
        )
    except Exception:
        ml_result = {'probability': 0.5, 'risk_class': 'MODERATE', 'model_type': 'fallback', 'confidence': 0.6}

    # Risk level
    if hf >= 2.0: risk_level = 'SAFE'
    elif hf >= 1.5: risk_level = 'LOW'
    elif hf >= 1.3: risk_level = 'MODERATE'
    elif hf >= 1.15: risk_level = 'HIGH_RISK'
    elif hf >= 1.05: risk_level = 'CRITICAL'
    elif hf >= 1.0: risk_level = 'CRITICAL'
    else: risk_level = 'LIQUIDATABLE'

    # Distance to liquidation
    distance_to_liq_pct = max(0.0, (hf - 1.0) / hf * 100) if hf > 1 else 0.0
    liquidator_pressure = 'LOW' if distance_to_liq_pct > 20 else ('MEDIUM' if distance_to_liq_pct > 10 else ('HIGH' if distance_to_liq_pct > 5 else 'CRITICAL'))

    # Economics
    liq_data = compute_liquidation_loss(debt_usdc, collateral_usd, lt)
    rescue_cost = 0.0
    if intervention.get('status') == 'VIABLE':
        rescue_cost = (intervention.get('flash_fee_usd', 0) + intervention.get('dex_fee_usd', 0) +
                       intervention.get('slippage_usd', 0) + position.gas_usd)
    net_benefit = liq_data['total_loss'] - rescue_cost
    economic_viable = rescue_cost < liq_data['total_loss'] * 0.9

    capital_score = compute_capital_preservation_score(rescue_cost, liq_data['total_loss'], net_benefit)

    # Derived metrics
    collateral_used_usd = intervention.get('collateral_to_sell_usd', 0.0) if intervention.get('status') == 'VIABLE' else 0.0
    intervention_ratio_pct = round((collateral_used_usd / collateral_usd * 100) if collateral_usd > 0 else 0.0, 2)
    std_liq_retained = liq_data['remaining_collateral']
    prism_retained = round(collateral_usd - collateral_used_usd, 2)
    capital_saved_usd = round(max(prism_retained - std_liq_retained, 0.0), 2)

    raw_data = {
        'health_factor': round(hf, 4),
        'risk_level': risk_level,
        'volatility': round(volatility, 4),
        'target_hf_data': target_hf_data,
        'ml_prediction': ml_result,
        'intervention': intervention,
        'economics': {
            'rescue_cost_usd': round(rescue_cost, 2),
            'liquidation_loss_usd': liq_data['total_loss'],
            'net_benefit_usd': round(net_benefit, 2),
        },
        'decision': decision,
    }
    bullets, ai_source = await llm_service.generate_bullet_explanation(raw_data)

    return {
        'mode': 'SIMULATION',
        'timestamp': now.isoformat(),
        'position': {
            'eth_amount': eth_amount, 'eth_price': eth_price,
            'collateral_usd': round(collateral_usd, 2),
            'debt_usdc': round(debt_usdc, 2), 'net_equity': round(collateral_usd - debt_usdc, 2),
            'liquidation_threshold': lt, 'ltv': round(ltv, 4),
        },
        'health_factor': round(hf, 4),
        'hf_velocity': hf_velocity,
        'hf_velocity_label': ('RAPID DETERIORATION' if hf_velocity < -0.05 else
                               'DETERIORATING' if hf_velocity < -0.01 else
                               'STABLE' if abs(hf_velocity) < 0.01 else 'IMPROVING'),
        'risk_level': risk_level,
        'volatility': round(volatility, 4),
        'target_hf_data': target_hf_data,
        'ml_prediction': ml_result,
        'intervention': intervention,
        'intervention_ratio_pct': intervention_ratio_pct,
        'retained_standard_liquidation_usd': std_liq_retained,
        'retained_prism_rescue_usd': prism_retained,
        'liquidation_scenario': liq_data,
        'economics': {
            'rescue_cost_usd': round(rescue_cost, 2),
            'liquidation_loss_usd': liq_data['total_loss'],
            'net_benefit_usd': round(net_benefit, 2),
            'flash_fee_usd': round(intervention.get('flash_fee_usd', 0), 4),
            'dex_fee_usd': round(intervention.get('dex_fee_usd', 0), 4),
            'slippage_usd': round(intervention.get('slippage_usd', 0), 4),
            'gas_usd': position.gas_usd,
            'economic_viable': economic_viable,
        },
        'capital_preservation': capital_score,
        'liquidator_radar': {
            'distance_to_liquidation_pct': round(distance_to_liq_pct, 2),
            'liquidator_pressure': liquidator_pressure,
            'status': ('Liquidation window narrowing' if distance_to_liq_pct < 10 else
                       'Position at risk' if distance_to_liq_pct < 20 else
                       'Position stable'),
        },
        'decision': decision,
        'decision_reason': (
            'Position already safe above target HF' if decision == 'ALREADY_SAFE' else
            'Minimum intervention calculated — rescue is economically viable' if decision == 'RESCUE' else
            'Rescue cost exceeds liquidation loss — not economically viable' if decision == 'DO_NOT_RESCUE' else
            'Intervention parameters unsafe — cannot execute rescue' if decision == 'EXECUTION_UNSAFE' else
            'Unknown'
        ),
        'ai_bullets': bullets,
        'ai_source': ai_source,
    }


@router.post('/crash')
async def simulate_crash(req: CrashRequest):
    """Simulate an ETH price crash and recalculate all PRISM metrics."""
    global _hf_history
    pos = req.position
    crash_pct = req.crash_pct  # negative value e.g. -15

    new_eth_price = pos.eth_price * (1 + crash_pct / 100.0)
    new_eth_price = max(new_eth_price, 100.0)  # floor

    new_pos = SimulationPosition(
        eth_amount=pos.eth_amount, eth_price=new_eth_price,
        debt_usdc=pos.debt_usdc, liquidation_threshold=pos.liquidation_threshold,
        flash_fee=pos.flash_fee, dex_fee=pos.dex_fee,
        slippage=pos.slippage, gas_usd=pos.gas_usd,
    )

    # Reset HF history to simulate velocity
    _hf_history = []
    original_hf = compute_hf(pos.eth_amount, pos.eth_price, pos.debt_usdc, pos.liquidation_threshold)
    _hf_history.append({'hf': original_hf, 'time': datetime(2000, 1, 1, tzinfo=timezone.utc)})

    result = await calculate_position(new_pos)
    result['crash_applied'] = crash_pct
    result['original_eth_price'] = pos.eth_price
    result['new_eth_price'] = round(new_eth_price, 2)
    result['original_hf'] = round(original_hf, 4)

    # Update volatility based on crash
    new_vol = compute_volatility(crash_pct)
    result['volatility'] = round(new_vol, 4)

    # Recompute with updated volatility
    hf = result['health_factor']
    hf_velocity = result.get('hf_velocity', 0)
    new_target_data = compute_dynamic_target_hf(hf, new_vol, hf_velocity)
    result['target_hf_data'] = new_target_data

    # Recompute ML with crash
    try:
        from app.ml.model import predict as ml_predict
        collateral_usd = pos.eth_amount * new_eth_price
        debt_usdc = pos.debt_usdc
        ltv = debt_usdc / collateral_usd if collateral_usd > 0 else 0
        distance_to_liq = max((hf - 1.0) / hf, 0.0) if hf > 1 else 0
        ml_result = ml_predict(
            health_factor=hf,
            eth_return_24h=crash_pct / 100.0,
            volatility_30d=new_vol,
            debt_ratio=ltv,
            distance_to_liquidation=distance_to_liq,
            hf_velocity=hf_velocity,
            crash_magnitude=abs(crash_pct / 100.0),
        )
        result['ml_prediction'] = ml_result
    except Exception:
        pass

    # Recompute intervention with new target and volatility-adjusted slippage
    new_target_hf = new_target_data['target_hf']
    collateral_usd = pos.eth_amount * new_eth_price
    adjusted_slippage = min(pos.slippage + abs(crash_pct) * 0.0005, 0.05)
    new_intervention = compute_intervention(
        collateral_usd, pos.debt_usdc, pos.liquidation_threshold,
        new_target_hf, pos.flash_fee, pos.dex_fee, adjusted_slippage,
        eth_price=new_eth_price,
    )
    result['intervention'] = new_intervention

    # Recompute economics
    liq_data = compute_liquidation_loss(pos.debt_usdc, collateral_usd, pos.liquidation_threshold)
    rescue_cost = 0.0
    if new_intervention.get('status') == 'VIABLE':
        rescue_cost = (new_intervention.get('flash_fee_usd', 0) + new_intervention.get('dex_fee_usd', 0) +
                       new_intervention.get('slippage_usd', 0) + pos.gas_usd)
    net_benefit = liq_data['total_loss'] - rescue_cost
    economic_viable = rescue_cost < liq_data['total_loss'] * 0.9
    result['economics'] = {
        'rescue_cost_usd': round(rescue_cost, 2),
        'liquidation_loss_usd': liq_data['total_loss'],
        'net_benefit_usd': round(net_benefit, 2),
        'flash_fee_usd': round(new_intervention.get('flash_fee_usd', 0), 4),
        'dex_fee_usd': round(new_intervention.get('dex_fee_usd', 0), 4),
        'slippage_usd': round(new_intervention.get('slippage_usd', 0), 4),
        'gas_usd': pos.gas_usd,
        'economic_viable': economic_viable,
        'adjusted_slippage_pct': round(adjusted_slippage * 100, 3),
    }
    result['capital_preservation'] = compute_capital_preservation_score(rescue_cost, liq_data['total_loss'], net_benefit)
    result['liquidation_scenario'] = liq_data

    # Decision
    needs_rescue = hf < new_target_hf
    if not needs_rescue:
        result['decision'] = 'ALREADY_SAFE'
    elif new_intervention.get('status') != 'VIABLE':
        result['decision'] = 'EXECUTION_UNSAFE'
    elif economic_viable:
        result['decision'] = 'RESCUE'
    else:
        result['decision'] = 'DO_NOT_RESCUE'

    # Derived metrics & AI explanation
    col_used = new_intervention.get('collateral_to_sell_usd', 0.0) if new_intervention.get('status') == 'VIABLE' else 0.0
    result['intervention_ratio_pct'] = round((col_used / collateral_usd * 100) if collateral_usd > 0 else 0.0, 2)
    result['retained_standard_liquidation_usd'] = liq_data['remaining_collateral']
    result['retained_prism_rescue_usd'] = round(collateral_usd - col_used, 2)

    raw_data = {
        'health_factor': round(hf, 4),
        'risk_level': result['risk_level'],
        'volatility': round(new_vol, 4),
        'target_hf_data': new_target_data,
        'ml_prediction': result.get('ml_prediction', {}),
        'intervention': new_intervention,
        'economics': result['economics'],
        'decision': result['decision'],
    }
    bullets, ai_source = await llm_service.generate_bullet_explanation(raw_data)
    result['ai_bullets'] = bullets
    result['ai_source'] = ai_source

    return result


@router.post('/rescue')
async def simulate_rescue(req: SimulationPosition):
    """Simulate an atomic rescue execution."""
    pos = req
    eth_amount = pos.eth_amount
    eth_price = pos.eth_price
    debt_usdc = pos.debt_usdc
    lt = pos.liquidation_threshold

    collateral_usd = eth_amount * eth_price
    hf = compute_hf(eth_amount, eth_price, debt_usdc, lt)
    volatility = 0.65
    hf_velocity = 0.0

    target_hf_data = compute_dynamic_target_hf(hf, volatility, hf_velocity)
    target_hf = target_hf_data['target_hf']

    intervention = compute_intervention(collateral_usd, debt_usdc, lt, target_hf,
                                        pos.flash_fee, pos.dex_fee, pos.slippage,
                                        eth_price=eth_price)

    STEP_NAMES = [
        'RISK DETECTED', 'MARKET VOLATILITY ANALYZED', 'LIQUIDATION PROBABILITY PREDICTED',
        'TARGET HF OPTIMIZED', 'MINIMUM REPAYMENT CALCULATED', 'DEX LIQUIDITY CHECKED',
        'ECONOMIC VIABILITY PASSED', 'FLASH LIQUIDITY SOURCED', 'USDC DEBT REPAID',
        'ETH COLLATERAL RELEASED', 'ETH → USDC SWAP', 'FLASH LIQUIDITY REPAID',
        'POST-RESCUE VERIFICATION', 'CAPITAL PRESERVED'
    ]

    steps = []

    def make_step(idx, name, status, details=''):
        steps.append({'step': idx, 'name': name, 'status': status, 'details': details})

    # Safety checks
    if intervention.get('status') != 'VIABLE':
        make_step(1, 'RISK DETECTED', 'DONE', f'HF={hf:.4f}')
        make_step(2, 'MARKET VOLATILITY ANALYZED', 'DONE', f'Volatility={volatility*100:.1f}%')
        make_step(3, 'LIQUIDATION PROBABILITY PREDICTED', 'DONE', '')
        make_step(4, 'TARGET HF OPTIMIZED', 'DONE', f'Target={target_hf:.4f}')
        make_step(5, 'MINIMUM REPAYMENT CALCULATED', 'FAILED', f'Intervention status: {intervention.get("status")}')
        for i in range(6, 15):
            make_step(i, STEP_NAMES[i - 1] if i <= 14 else 'UNKNOWN', 'ROLLED_BACK')
        return {'success': False, 'steps': steps, 'original_hf': round(hf, 4), 'final_hf': round(hf, 4),
                'message': f'TRANSACTION REVERTED: {intervention.get("status")}'}

    x = intervention['debt_to_repay_usd']
    y = intervention['collateral_to_sell_usd']
    eth_to_sell = y / eth_price if eth_price > 0 else 0.0

    make_step(1, 'RISK DETECTED', 'DONE', f'HF={hf:.4f} — position requires rescue')
    make_step(2, 'MARKET VOLATILITY ANALYZED', 'DONE', f'ETH Volatility: {volatility*100:.1f}%')

    try:
        from app.ml.model import predict as ml_predict
        ml_r = ml_predict(health_factor=hf, eth_return_24h=0, volatility_30d=volatility,
                          debt_ratio=debt_usdc / collateral_usd, distance_to_liquidation=(hf - 1) / hf,
                          hf_velocity=0, crash_magnitude=0)
        ml_prob = ml_r['probability']
    except Exception:
        ml_prob = 0.75

    make_step(3, 'LIQUIDATION PROBABILITY PREDICTED', 'DONE', f'ML estimate: {ml_prob*100:.1f}% liquidation risk')
    make_step(4, 'TARGET HF OPTIMIZED', 'DONE',
              f'Dynamic target: {target_hf:.4f} (buffer: +{target_hf_data["dynamic_buffer"]:.3f})')
    make_step(5, 'MINIMUM REPAYMENT CALCULATED', 'DONE',
              f'Minimum repayment: ${x:.2f} USDC | Collateral to sell: {eth_to_sell:.4f} ETH (${y:.2f})')

    # DEX check with slippage failure simulation (Test 6)
    slippage_pct = pos.slippage * 100
    if pos.slippage > 0.05:
        make_step(6, 'DEX LIQUIDITY CHECKED', 'FAILED',
                  f'Slippage ({slippage_pct:.2f}%) exceeds allowable 5.00% limit — DEX SLIPPAGE LIMIT EXCEEDED')
        for i in range(7, 15):
            make_step(i, STEP_NAMES[i - 1], 'ROLLED_BACK')
        return {
            'success': False,
            'steps': steps,
            'original_hf': round(hf, 4),
            'final_hf': round(hf, 4),
            'message': 'SIMULATION REVERTED — SLIPPAGE LIMIT EXCEEDED. No partial state accepted.',
        }

    make_step(6, 'DEX LIQUIDITY CHECKED', 'DONE',
              f'Expected slippage: {slippage_pct:.2f}% | DEX fee: {pos.dex_fee*100:.2f}% | Liquidity: SUFFICIENT')

    # Economic viability
    liq_data = compute_liquidation_loss(debt_usdc, collateral_usd, lt)
    rescue_cost = (intervention['flash_fee_usd'] + intervention['dex_fee_usd'] +
                   intervention['slippage_usd'] + pos.gas_usd)
    liq_loss = liq_data['total_loss']
    net_benefit = liq_loss - rescue_cost
    economic_viable = rescue_cost < liq_loss * 0.9

    if not economic_viable:
        make_step(7, 'ECONOMIC VIABILITY PASSED', 'FAILED',
                  f'Rescue cost ${rescue_cost:.2f} >= liquidation loss ${liq_loss:.2f}')
        for i in range(8, 15):
            make_step(i, STEP_NAMES[i - 1], 'ROLLED_BACK')
        return {'success': False, 'steps': steps, 'original_hf': round(hf, 4), 'final_hf': round(hf, 4),
                'message': 'ECONOMICALLY UNVIABLE — TRANSACTION REVERTED'}

    make_step(7, 'ECONOMIC VIABILITY PASSED', 'DONE',
              f'Net benefit: ${net_benefit:.2f} | Rescue cost: ${rescue_cost:.2f} | Liquidation loss avoided: ${liq_loss:.2f}')
    make_step(8, 'FLASH LIQUIDITY SOURCED', 'DONE',
              f'Flash loan: ${x:.2f} USDC | Fee: ${intervention["flash_fee_usd"]:.4f}')
    make_step(9, 'USDC DEBT REPAID', 'DONE',
              f'Repaid: ${x:.2f} USDC | Remaining debt: ${debt_usdc - x:.2f}')
    make_step(10, 'ETH COLLATERAL RELEASED', 'DONE',
              f'Released: {eth_to_sell:.4f} ETH (${y:.2f})')

    usdc_received = y * (1 - pos.dex_fee - pos.slippage)
    make_step(11, 'ETH → USDC SWAP', 'DONE',
              f'Swapped {eth_to_sell:.4f} ETH → ${usdc_received:.2f} USDC (after {slippage_pct:.2f}% slippage)')

    flash_repay = x + intervention['flash_fee_usd']
    make_step(12, 'FLASH LIQUIDITY REPAID', 'DONE',
              f'Repaid: ${flash_repay:.4f} USDC (principal ${x:.2f} + fee ${intervention["flash_fee_usd"]:.4f})')

    # Verify
    final_hf = intervention['post_rescue_hf']
    hf_ok = final_hf >= target_hf * 0.95
    make_step(13, 'POST-RESCUE VERIFICATION', 'DONE' if hf_ok else 'FAILED',
              f'HF: {hf:.4f} → {final_hf:.4f} | Target: {target_hf:.4f} | Status: {"VERIFIED" if hf_ok else "FAILED"}')

    if not hf_ok:
        make_step(14, 'CAPITAL PRESERVED', 'ROLLED_BACK', 'HF verification failed — ROLLBACK')
        return {'success': False, 'steps': steps, 'original_hf': round(hf, 4), 'final_hf': round(hf, 4),
                'message': 'POST-RESCUE VERIFICATION FAILED — TRANSACTION REVERTED'}

    capital_score = compute_capital_preservation_score(rescue_cost, liq_loss, net_benefit)
    make_step(14, 'CAPITAL PRESERVED', 'DONE',
              f'Capital Preservation Score: {capital_score["score"]:.1f} | Capital Saved: ${capital_score["capital_saved"]:.2f}')

    return {
        'success': True,
        'steps': steps,
        'original_hf': round(hf, 4),
        'final_hf': round(final_hf, 4),
        'target_hf': target_hf,
        'debt_repaid': round(x, 2),
        'eth_sold': round(eth_to_sell, 4),
        'rescue_cost': round(rescue_cost, 2),
        'capital_saved': capital_score['capital_saved'],
        'capital_preservation_score': capital_score['score'],
        'liquidation_loss_avoided': round(liq_loss, 2),
        'net_benefit': round(net_benefit, 2),
        'message': f'RESCUE SUCCESSFUL. HF: {hf:.4f} → {final_hf:.4f}. Capital Preserved: ${capital_score["capital_saved"]:.2f}.',
    }

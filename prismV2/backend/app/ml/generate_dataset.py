"""
PRISM ML Dataset Generator — generates synthetic ETH/USDC position scenarios
"""
import numpy as np
import pandas as pd
import random
import math

def generate_scenarios(n=10000, seed=42):
    np.random.seed(seed)
    random.seed(seed)
    rows = []
    for _ in range(n):
        eth_price = np.random.uniform(800, 5000)
        eth_amount = np.random.uniform(0.5, 50)
        collateral = eth_amount * eth_price
        lt = 0.825  # fixed for ETH/USDC
        target_hf = np.random.uniform(1.0, 3.0)
        debt = (collateral * lt) / target_hf
        hf = (collateral * lt) / debt if debt > 0 else 999
        eth_return_24h = np.random.normal(0, 0.04)
        volatility = np.random.uniform(0.30, 1.20)
        debt_ratio = debt / collateral if collateral > 0 else 0
        distance_to_liq = (hf - 1.0) / hf if hf > 0 else 0
        hf_velocity = np.random.normal(-0.01, 0.05)
        crash_magnitude = max(0, -eth_return_24h)
        # Simulate future: ETH drops by 1-3 volatility days
        future_drop = abs(np.random.normal(0, volatility / math.sqrt(52)))
        future_eth = eth_price * (1 - future_drop)
        future_collateral = eth_amount * future_eth
        future_hf = (future_collateral * lt) / debt if debt > 0 else 999
        liquidated = 1 if future_hf < 1.0 else 0
        rows.append({
            'eth_price': eth_price, 'eth_amount': eth_amount,
            'collateral_usd': collateral, 'debt_usd': debt,
            'health_factor': hf, 'eth_return_24h': eth_return_24h,
            'volatility_30d': volatility, 'debt_ratio': debt_ratio,
            'distance_to_liquidation': distance_to_liq,
            'hf_velocity': hf_velocity, 'crash_magnitude': crash_magnitude,
            'liquidated': liquidated,
        })
    return pd.DataFrame(rows)

if __name__ == '__main__':
    df = generate_scenarios()
    df.to_csv('ml_training_data.csv', index=False)
    print(f'Generated {len(df)} scenarios. Liquidation rate: {df.liquidated.mean()*100:.1f}%')

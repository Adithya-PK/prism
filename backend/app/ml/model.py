"""
PRISM ML Model — trains and runs liquidation risk prediction
"""
import os
import pickle
import math
import logging
from typing import Optional, Dict, Any
import numpy as np

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'prism_model.pkl')
FEATURES = [
    'health_factor', 'eth_return_24h', 'volatility_30d',
    'debt_ratio', 'distance_to_liquidation', 'hf_velocity', 'crash_magnitude'
]


def train_model():
    """Train the ML model and save it."""
    try:
        from sklearn.ensemble import GradientBoostingClassifier
        from sklearn.preprocessing import StandardScaler
        from sklearn.pipeline import Pipeline
        from .generate_dataset import generate_scenarios

        df = generate_scenarios(n=12000)
        X = df[FEATURES].values
        y = df['liquidated'].values

        model = Pipeline([
            ('scaler', StandardScaler()),
            ('clf', GradientBoostingClassifier(n_estimators=100, max_depth=4, random_state=42))
        ])
        model.fit(X, y)

        with open(MODEL_PATH, 'wb') as f:
            pickle.dump(model, f)
        logger.info(f'ML model trained and saved to {MODEL_PATH}')
        return model
    except Exception as e:
        logger.error(f'Model training failed: {e}')
        return None


def load_model():
    """Load the trained model, or train if not found."""
    if os.path.exists(MODEL_PATH):
        try:
            with open(MODEL_PATH, 'rb') as f:
                return pickle.load(f)
        except Exception as e:
            logger.warning(f'Model load failed: {e}. Retraining...')
    return train_model()


_model = None

def get_model():
    global _model
    if _model is None:
        _model = load_model()
    return _model


def predict(
    health_factor: float,
    eth_return_24h: float,
    volatility_30d: float,
    debt_ratio: float,
    distance_to_liquidation: float,
    hf_velocity: float = 0.0,
    crash_magnitude: float = 0.0,
) -> Dict[str, Any]:
    """Predict liquidation probability."""
    model = get_model()

    if model is None:
        # Fallback: deterministic sigmoid approximation
        hf_margin = max(health_factor - 1.0, 0.001)
        vol = max(volatility_30d, 0.01)
        prob = 1.0 / (1.0 + math.exp(6 * (hf_margin - vol)))
        return {
            'probability': round(min(prob, 0.99), 4),
            'risk_class': _classify(prob),
            'model_type': 'deterministic_fallback',
            'confidence': 0.70,
        }

    try:
        features = np.array([[health_factor, eth_return_24h, volatility_30d,
                               debt_ratio, distance_to_liquidation, hf_velocity, crash_magnitude]])
        raw_prob = float(model.predict_proba(features)[0][1])

        # Enforce financial monotonicity: when HF <= 1.0, position is in liquidation breach
        if health_factor <= 1.0:
            # Scale smoothly from 98.0% at HF=1.00 down to 99.9% at HF<=0.75 or crash >= 30%
            depth = max(0.0, 1.0 - health_factor)
            crash_depth = max(0.0, abs(crash_magnitude))
            monotonic_floor = min(0.980 + (depth * 0.08) + (crash_depth * 0.04), 0.999)
            prob = max(raw_prob, monotonic_floor)
            confidence = min(0.95 + (depth * 0.05) + (crash_depth * 0.05), 0.99)
        else:
            prob = raw_prob
            confidence = max(abs(prob - 0.5) * 2, 0.5)

        return {
            'probability': round(min(prob, 0.999), 4),
            'risk_class': _classify(prob),
            'model_type': 'GradientBoosting',
            'confidence': round(confidence, 2),
        }
    except Exception as e:
        logger.error(f'ML predict error: {e}')
        if health_factor <= 1.0:
            depth = max(0.0, 1.0 - health_factor)
            prob = min(0.980 + (depth * 0.08), 0.999)
            conf = 0.98
        else:
            hf_margin = max(health_factor - 1.0, 0.001)
            vol = max(volatility_30d, 0.01)
            prob = 1.0 / (1.0 + math.exp(6 * (hf_margin - vol)))
            conf = 0.70
        return {
            'probability': round(min(prob, 0.999), 4),
            'risk_class': _classify(prob),
            'model_type': 'deterministic_fallback',
            'confidence': conf,
        }


def _classify(prob: float) -> str:
    if prob >= 0.80: return 'CRITICAL'
    if prob >= 0.60: return 'HIGH'
    if prob >= 0.40: return 'MODERATE'
    if prob >= 0.20: return 'LOW'
    return 'SAFE'

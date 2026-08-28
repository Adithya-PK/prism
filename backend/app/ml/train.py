"""Train and save the PRISM ML model."""
import logging
logging.basicConfig(level=logging.INFO)
from app.ml.model import train_model
train_model()

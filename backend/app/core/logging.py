import logging
import sys

# Standardized format: [Time] [Level] [Module]: Message
LOG_FORMAT = "[%(asctime)s] %(levelname)s in %(module)s: %(message)s"

def get_logger(name: str):
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter(LOG_FORMAT))
        logger.addHandler(handler)
    
    return logger

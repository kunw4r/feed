import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

# Database
DATABASE_PATH = DATA_DIR / "briefing.db"

# API Keys
ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
NEWS_API_KEY: str = os.getenv("NEWS_API_KEY", "")
GNEWS_API_KEY: str = os.getenv("GNEWS_API_KEY", "")

# Environment
ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
PIPELINE_SCHEDULE: str = os.getenv("PIPELINE_SCHEDULE", "0 5 * * *")

# Pipeline
REQUEST_TIMEOUT: int = 30  # seconds per RSS feed fetch
MAX_CONCURRENT_FEEDS: int = 10
DEDUP_THRESHOLD: float = 0.7

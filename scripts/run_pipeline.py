#!/usr/bin/env python3
"""Manual trigger for the news ingestion pipeline."""

import asyncio
import logging
import sys
from pathlib import Path

# Add project root to path so imports work
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.scheduler.pipeline import run_pipeline


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    print("Starting news pipeline...")
    summary = asyncio.run(run_pipeline())

    print("\n--- Pipeline Summary ---")
    for key, value in summary.items():
        print(f"  {key}: {value}")
    print("------------------------")


if __name__ == "__main__":
    main()

import json
from pathlib import Path

# Placeholder processor for future NASA temperature files.
# It will transform raw NASA output into app-ready JSON for the dashboard.

RAW_DIR = Path(__file__).resolve().parent.parent / "raw"
PROCESSED_DIR = Path(__file__).resolve().parent.parent / "processed"
PROCESSED_DIR.mkdir(exist_ok=True, parents=True)

print("NASA processing pipeline ready.")
print(f"Raw folder: {RAW_DIR}")
print(f"Processed folder: {PROCESSED_DIR}")

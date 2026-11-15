# Analysis and AI Agent Guide

This document explains how to build the analysis layer for Trend Detective and how an AI assistant or contributor should call the data pipeline and use the generated outputs.

## Goal

Keep the project split into three clear layers:

1. Raw scientific source data
2. Processed analysis-ready data
3. Front-end dashboard consumption

This prevents the UI from depending on messy NASA files or unsupported data formats.

---

## Project data flow

Use this flow for every dataset:

Raw input -> cleaning/aggregation -> processed JSON/CSV -> dashboard

### Required folders

- `raw-data/` — original source and downloaded files
- `nasa-ingestion/raw/` — NASA Earthdata downloads kept separate from app files
- `processed-data/` — final app-ready JSON files used by the front-end
- `nasa-ingestion/processed/` — cleaned outputs used for science/analysis work
- `Temp/` or `ui/` — visualization layer that reads processed JSON

### Rule

Do not load raw NASA files directly into the front-end.
The app should only read output from `processed-data/` or another cleaned JSON/CSV file.

---

## What has already been built

The project already includes a working climate dashboard pattern:

- `processed-data/global-temperature-annual.json`
- `Temp/temperature-ozone.js`
- `Temp/temperature-ozone.html`
- `nasa-ingestion/scripts/download_nasa_data.py`

This means the system expects a processed dataset with a simple timeline structure rather than a raw scientific file.

---

## Required JSON contract for the dashboard

The front-end expects data shaped like this:

```json
{
  "meta": {
    "name": "Global Annual Temperature",
    "updated": "2026-11-15",
    "baseline": "2002-2016"
  },
  "years": [2002, 2003, 2004],
  "signals": {
    "temperature": {
      "unit": "°C",
      "series": [14.2, 14.4, 14.7],
      "locations": [
        {"name": "Global Average", "lat": 0, "lng": 0, "value": 14.2},
        {"name": "Northern Hemisphere", "lat": 40, "lng": -100, "value": 15.1}
      ]
    }
  }
}
```

### Required fields

- `meta.name` — dataset label
- `meta.updated` — last refresh date
- `meta.baseline` — baseline description
- `years` — list of years
- `signals.<name>.unit` — unit label
- `signals.<name>.series` — numeric values aligned to `years`
- `signals.<name>.locations` — optional map markers or regional values

### Important: alignment rule

The `series` array must be in the same order as `years`.
If `years[0] = 2002`, then `series[0]` must represent that year.

---

## Analysis workflow for contributors

### Step 1: fetch raw data

Use the NASA ingestion scripts first.

Example:

```bash
set EARTHDATA_TOKEN=your_token_here
python nasa-ingestion\scripts\download_nasa_data.py
```

This checks NASA CMR metadata and can be expanded to download specific granules.

### Step 2: clean and transform

The analysis layer should convert raw NASA scientific output into a compact dashboard dataset.

Typical operations:

- read raw HDF / NetCDF / CSV
- filter by date range and region
- aggregate monthly -> annual values
- convert Kelvin to Celsius if needed
- round values for readability
- build a clean `years[]` and `series[]` structure

### Step 3: save to processed-data

The processed output should be saved in a file such as:

- `processed-data/global-temperature-annual.json`
- `processed-data/soil-moisture.json`
- `processed-data/vegetation-index.json`

The file should be ready for browser fetch and chart drawing.

### Step 4: update the UI

If the new metric is intentionally displayed in dashboard cards or chart panels, then the front-end script should read the new field from the processed file.

Do not push raw scientific logic into the browser.

---

## How an AI should work with this project

### Good AI behavior

- Search the existing processed-data files first
- Match the existing JSON contract exactly
- Keep `raw-data` and `nasa-ingestion` separate from app logic
- Create a new processing script when adding a new dataset type
- Write outputs into `processed-data/` only when they are app-ready

### AI decision path

1. Check whether the dataset already exists in `processed-data/`
2. If not, look in `nasa-ingestion/raw/` or the user-provided raw source
3. Build a transform script to aggregate and clean the data
4. Save processed output with the dashboard schema
5. Load the processed file in the UI

### AI should not do this

- do not place raw NASA files into root app folders
- do not hardcode tokens into repository files
- do not create ad hoc JSON shapes without matching the dashboard contract
- do not make the browser parse NetCDF/HDF directly unless absolutely necessary

---

## Recommended script patterns

### Analysis script layout

A new analysis script should follow this pattern:

```python
# load raw file
# filter data
# compute yearly or regional aggregate
# write app-ready JSON
```

### Output pattern

```python
result = {
    "meta": {
        "name": "Dataset Name",
        "updated": "2026-11-15",
        "baseline": "1991-2020"
    },
    "years": years,
    "signals": {
        "temperature": {
            "unit": "°C",
            "series": series,
            "locations": locations
        }
    }
}
```

Save it as JSON in `processed-data/`.

---

## Example commands

### Check available NASA granules

```bash
set EARTHDATA_TOKEN=your_token_here
python nasa-ingestion\scripts\download_nasa_data.py
```

### Download a selected dataset in a controlled way

```bash
set EARTHDATA_TOKEN=your_token_here
python nasa-ingestion\scripts\download_nasa_data.py --download --max-size-mb 20
```

### Preprocess a raw file into app-ready JSON

```bash
python nasa-ingestion\scripts\process_temperature_to_dashboard.py
```

---

## Standard operating procedure for the team

1. Keep all raw scientific files in dedicated raw folders.
2. Convert to processed JSON before touching the UI.
3. Use the same schema for every new dataset.
4. Keep naming consistent: `years`, `series`, `locations`, `meta`.
5. Test in the browser only after the processed JSON is valid.

---

## Final rule

The dashboard is a consumer, not the source of truth.
The analysis layer is responsible for converting raw science into app-ready data.
Any AI or teammate building the analysis part should follow this contract and never bypass the processed-data layer.

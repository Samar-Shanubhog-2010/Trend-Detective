# NASA Ingestion Pipeline

This folder is dedicated to NASA Earthdata ingestion and processing. It is intentionally separated from the dashboard app so that raw scientific files and processed climate datasets never mix with the front-end code.

## Folder structure

- raw/ - original downloaded NASA files (.nc, .hdf, .tif, .csv, .json)
- processed/ - cleaned, transformed, app-ready datasets
- scripts/ - Python scripts for authentication, download, conversion, and analysis
- docs/ - API and workflow notes

## Required inputs

- Earthdata username/password or token
- A dataset URL or CMR search result
- Date range and region of interest

## Security note

Do not hardcode tokens in repository files. Prefer environment variables or secure secret storage.

## Typical workflow

1. Search NASA CMR or Giovanni metadata
2. Get download URL
3. Authenticate with token or Earthdata login
4. Download into raw/
5. Convert to CSV/JSON in processed/
6. Feed the cleaned dataset to the dashboard

## App separation rule

Do not import or edit files from this folder into the app code until they are converted into a dashboard-friendly JSON/CSV format.

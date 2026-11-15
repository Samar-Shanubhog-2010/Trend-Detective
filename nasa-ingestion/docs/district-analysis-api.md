# District analysis API contract

This document defines the expected response for a district-based Earthdata analysis call.

## Input

```bash
python nasa-ingestion/scripts/district_nasa_analysis.py "Hyderabad" --keyword temperature --start 2002-01-01 --end 2024-12-31
```

## Output shape

```json
{
  "district": "Hyderabad",
  "geography": {
    "centroid": { "lat": 17.385, "lon": 78.4867 },
    "bbox": [77.2, 17.0, 79.0, 18.0]
  },
  "dataset_search": {
    "keyword": "temperature",
    "time_range": { "start": "2002-01-01", "end": "2024-12-31" },
    "hits": 5,
    "results": [
      { "short_name": "AIRX3STM", "version": "006", "title": "AIRS Temperature Dataset" }
    ]
  },
  "analysis": {
    "signal": "temperature",
    "years": [2002, 2003, 2004],
    "series": [21.3, 21.8, 22.2],
    "trend": {
      "direction": "warming",
      "slope_per_year": 0.12
    },
    "anomaly": {
      "latest_zscore": 1.7,
      "anomaly_count": 2
    },
    "insights": [
      "The temperature trend for this district is warming.",
      "There are notable anomaly periods in the selected history."
    ]
  },
  "charts": {
    "trend": { "type": "line", "labels": ["2002", "2003"], "datasets": [] },
    "anomaly": { "type": "bar", "labels": ["2002", "2003"], "datasets": [] }
  }
}
```

## Rules for AI agents

- Use the district name to geocode first and derive a bounding box.
- Use NASA CMR to find candidate datasets.
- Use the Earthdata bearer token for authenticated requests.
- Aggregate the selected variables to district-level time series.
- Detect trend and anomaly with standard statistical methods.
- Return chart-ready payloads for the front-end.
- Keep raw NASA files separated from app code until processed to district-level JSON.

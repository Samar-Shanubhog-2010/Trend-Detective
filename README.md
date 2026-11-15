# Trend Detective

An interactive climate signal dashboard built with HTML5, CSS Grid/Flexbox, and vanilla JavaScript.

## Run locally

Serve this directory over HTTP (the browser blocks `fetch()` for local `file://` URLs):

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Project docs

- [`ANALYSIS_AGENT_GUIDE.md`](./ANALYSIS_AGENT_GUIDE.md) — rules for building the analysis pipeline and using the processed data contract

## Data integration

Set `DATA_URL` at the top of `app.js` to an external JSON endpoint. The endpoint should return the shape documented in [`sample-data.json`](./sample-data.json):

```json
{
  "meta": { "name": "Dataset name", "updated": "2024-12-01", "baseline": "1981-2010" },
  "years": [1980, 1985, 1990],
  "signals": {
    "water": {
      "unit": "%",
      "series": [48, 51, 49],
      "locations": [{ "name": "Europe", "lat": 52, "lng": 15, "value": 1.8 }]
    },
    "vegetation": {
      "unit": "%",
      "series": [72, 70, 68],
      "locations": [{ "name": "Amazon", "lat": -5, "lng": -60, "value": 81 }]
    }
  }
}
```

The loader validates the response and falls back to the bundled sample data when the external request fails.

## CDN dependencies

- [Leaflet 1.9.4](https://unpkg.com/leaflet@1.9.4/dist/leaflet.js) for interactive maps
- [Chart.js 4.4.4](https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js) for time series
- Google Fonts: Space Grotesk, DM Sans, and DM Mono
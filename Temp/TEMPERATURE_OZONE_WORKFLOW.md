# Temperature + Ozone Dashboard Workflow

## 1. Goal

This page shows how temperature and ozone change over time and how those changes behave at a district level. It combines:

- global annual temperature anomaly data
- global ozone index data
- district-based trend and anomaly summaries
- explanatory climate cause cards for heating and cooling
- world-map visualization with fixed full-image display for clarity

## 2. Data flow

The page follows a simple layered flow:

1. Raw scientific inputs are stored separately from the browser app.
2. The processed climate dataset is used by the dashboard in `processed-data/global-temperature-ozone-annual.json`.
3. The front-end reads that JSON and normalizes it into a predictable structure.
4. A district backend at `http://localhost:8001/api/district-analysis` can enrich the global view with place-specific values.
5. The UI then renders charts, map markers, summary cards, and narrative insights.

## 3. Where the logic lives

- `Temp/temperature-ozone.html` — page structure and visualization containers
- `Temp/temperature-ozone.js` — chart generation, map initialization, district analysis, and event wiring
- `styles.css` — layout, theme, cards, density, and map styling
- `nasa-ingestion/scripts/district_nasa_analysis.py` — district analysis logic used by the backend
- `nasa-ingestion/scripts/district_backend.py` — local HTTP API for district insight responses

## 4. Page behavior

### Temperature signal

- Reads annual temperature anomaly series from processed data.
- Uses the latest value to update the metric card.
- Draws the main time-series chart for the selected year.
- Renders day and night temperature comparison for a clearer thermal picture.

### Ozone signal

- Reads ozone metric values from the backend or fallback dataset.
- Displays global ozone index over time.
- Adds climate context cards to explain ozone impacts and recovery patterns.

### District drill-down

The district filter does the following:

1. Accepts a city, town, or district name.
2. Matches against a curated suggestion library for fast and accurate lookup.
3. Calls the district API with the selected location.
4. Caches the result in the browser for quick repeated use.
5. Draws a point on the global map and updates the summary cards.

## 5. Map behavior

The maps are intentionally displayed as full-world static images rather than zoomable map layers because the user requested a clean, high-quality global view without distortion. The map is kept at a fixed full-world frame and a marker is placed at the selected location when a district is chosen.

## 6. Chart and insight pattern

The page includes multiple chart layers:

- main temperature anomaly trend
- main ozone trend
- day vs night temperature chart
- warming driver bar chart
- ozone recovery chart
- delta-from-first-year comparison
- rolling average chart
- combined temperature and ozone view

These visual layers help explain both the long-term trend and the likely climate drivers behind it.

## 7. Preloaded climate explanation layer

Because real-time science retrieval may not always be available, the page also includes static but well-structured explanatory notes for common climate drivers:

- greenhouse gas forcing
- cloud cover / albedo changes
- urban heat islands
- ocean cycles
- land-use change
- ozone chemistry

These cards make the dashboard useful even before external APIs are fully active.

## 8. How to extend it

To add a new location or signal:

1. Expand the processed dataset schema in the JSON file.
2. Normalize the new field in `normalizeDashboardData()`.
3. Add the matching canvas or card in the HTML.
4. Create the chart in `createExtraCharts()`.
5. Wire any new district or source metadata into the summary panel.

## 9. Operational notes

- This page works best over a local HTTP server.
- The district API should be running on port 8001 for full drill-down behavior.
- If the backend is unavailable, the page falls back to a preloaded dataset and keeps the visual experience intact.

## 10. Summary

The dashboard is designed to work as both a polished public-facing climate page and a technical analysis shell. It balances aesthetics, data storytelling, and a practical science workflow while staying beginner-friendly and easy to extend.

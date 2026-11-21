# Trend Detective

An interactive climate signal dashboard built with HTML5, CSS Grid/Flexbox, and vanilla JavaScript.

## Run locally

Serve this directory over HTTP (the browser blocks `fetch()` for local `file://` URLs):

```bash
node dev-server.js
```

Then open `http://localhost:8000`.

The local Node server loads `OPENROUTER_API_KEY` from `.env`, so `/api/chat`
works without Vercel or deployment configuration. Keep `.env` uncommitted and
rotated if it has been shared or exposed.

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

## AI trend assistant

The global assistant is loaded on every dashboard page. It uses fixed FAQ answers for common starter questions and calls OpenRouter only for new questions.

Set this environment variable in Vercel or your local server environment:

```bash
OPENROUTER_API_KEY=your_key
```

Then deploy with the configured model `deepseek/deepseek-v4.1-flash-1017`. The key remains server-side in [`api/chat.js`](./api/chat.js); never add it to HTML or JavaScript files.

## CDN dependencies

- [Leaflet 1.9.4](https://unpkg.com/leaflet@1.9.4/dist/leaflet.js) for interactive maps
- [Chart.js 4.4.4](https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js) for time series
- Google Fonts: Space Grotesk, DM Sans, and DM Mono
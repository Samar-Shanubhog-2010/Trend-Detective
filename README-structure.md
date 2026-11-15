# Project structure

This workspace is organized for a climate dashboard workflow using raw source data, cleaned data, and generated UI files.

## Main folders

- [raw-data](./raw-data) — place all original source files here (CSV, NetCDF, GeoTIFF, KMZ, downloaded NASA/NOAA exports, etc.)
- [raw-data/temperature](./raw-data/temperature) — dedicated folder for temperature-only raw datasets
- [processed-data](./processed-data) — cleaned or transformed datasets in JSON/CSV format ready for the app
- [ui](./ui) — AI-generated UI files and reusable UI sections
- [ui/generated](./ui/generated) — generated dashboard screens, page layouts, and mockups
- [ui/components](./ui/components) — reusable components such as cards, charts, navbars, filters, and map panels

## Recommended workflow

1. Put raw files into [raw-data](./raw-data) or [raw-data/temperature](./raw-data/temperature)
2. Convert/clean them into JSON or CSV in [processed-data](./processed-data)
3. Drop any generated UI layouts into [ui/generated](./ui/generated)
4. Reuse common UI pieces in [ui/components](./ui/components)

## Map data requirement

For a map-focused page, the most useful data shapes are:

- years: numeric array
- signal: temperature or other metric series
- locations: array with name, lat, lng, value

Example shape:

```json
{
  "years": [1980, 1985, 1990],
  "signals": {
    "temperature": {
      "unit": "°C",
      "series": [0.2, 0.5, 0.9],
      "locations": [
        { "name": "Europe", "lat": 52, "lng": 15, "value": 0.9 }
      ]
    }
  }
}
```

## Notes

- Keep raw files untouched in [raw-data](./raw-data)
- Store cleaned / app-ready data in [processed-data](./processed-data)
- Keep UI files in [ui](./ui) so the layout is easy to navigate

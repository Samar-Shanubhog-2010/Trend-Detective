# NASA Earthdata API docs summary

## Primary sources

1. Earthdata Login
   - https://urs.earthdata.nasa.gov/
   - Authentication for NASA data access

2. CMR API
   - https://cmr.earthdata.nasa.gov/search/
   - Search datasets and granules

3. Giovanni
   - https://giovanni.gsfc.nasa.gov/giovanni/
   - Science data exploration and time-series extraction

4. Earthdata user resources
   - https://earthdata.nasa.gov/learn/user-resources
   - Tutorials and guidance

## Typical workflow

- Search datasets by keyword, variable, platform, and date range
- Find the granule or file URL
- Authenticate with a bearer token or Earthdata login
- Download the file
- Read with xarray, netCDF4, rasterio, or pandas depending on format

## Recommended approach for this project

Use Giovanni or CMR for discovery and download, then convert data to JSON/CSV for the dashboard. This is faster and easier than processing NetCDF files directly in the browser.

## Production-grade stack

- Python
- requests
- xarray
- netCDF4
- rasterio
- pandas
- matplotlib
- geopandas

## Security

- Keep credentials in environment variables
- Do not commit tokens to git
- Use bearer token auth where available

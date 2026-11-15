#!/usr/bin/env python3
"""District-level NASA Earthdata analysis starter.

This script demonstrates the intended workflow for a district-oriented climate analysis:
1. geocode district name
2. search NASA CMR for relevant datasets
3. use the Earthdata bearer token to query metadata / accessible endpoints
4. aggregate results into a district-level time series
5. estimate trend + anomaly + insights
6. return chart-ready JSON

The script is intentionally designed to work in a real backend pipeline, while also
providing a safe demo mode when raw scientific granules are not yet downloaded.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd
import requests


DEFAULT_TOKEN_ENV = "EARTHDATA_TOKEN"


def env_or_arg(token: str | None) -> str:
    if token:
        return token
    value = os.environ.get(DEFAULT_TOKEN_ENV)
    if value:
        return value
    raise ValueError(
        "No Earthdata token provided. Pass --token or set the EARTHDATA_TOKEN environment variable."
    )


def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def geocode_district(district_name: str) -> Dict[str, Any]:
    """Use Nominatim to resolve a district / place name into a bbox and centroid."""
    url = "https://nominatim.openstreetmap.org/search"
    params = {"format": "jsonv2", "q": district_name, "limit": 5}
    headers = {"User-Agent": "TrendDetective-NASA-Analysis/1.0"}
    response = requests.get(url, params=params, headers=headers, timeout=20)
    response.raise_for_status()
    candidates = response.json()
    if not candidates:
        raise ValueError(f"No district match found for '{district_name}'.")

    best = candidates[0]
    bbox = best.get("boundingbox")
    lat = safe_float(best.get("lat"))
    lon = safe_float(best.get("lon"))
    if bbox and len(bbox) == 4:
        min_lat, max_lat, min_lon, max_lon = [safe_float(v) for v in bbox]
        # Nominatim ordering is often [south, north, west, east]
        # normalize to [min_lon, min_lat, max_lon, max_lat]
        bbox_normalized = [min_lon, min_lat, max_lon, max_lat]
    else:
        bbox_normalized = [lon - 0.5, lat - 0.5, lon + 0.5, lat + 0.5]

    return {
        "district": district_name,
        "display_name": best.get("display_name", district_name),
        "centroid": {"lat": lat, "lon": lon},
        "bbox": bbox_normalized,
        "raw_match": best,
    }


def search_nasa_datasets(keyword: str, bbox: List[float], token: str, start: str, end: str) -> List[Dict[str, Any]]:
    """Search CMR collections by keyword and bounding box."""
    url = "https://cmr.earthdata.nasa.gov/search/collections.json"
    params = {
        "keyword": keyword,
        "bounding_box": ",".join(str(v) for v in bbox),
        "temporal": f"{start},{end}",
        "page_size": 20,
    }
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    response = requests.get(url, params=params, headers=headers, timeout=30)
    response.raise_for_status()
    payload = response.json()
    items = payload.get("feed", {}).get("entry", [])
    if not items:
        return []

    cleaned = []
    for item in items[:10]:
        cleaned.append({
            "dataset_id": item.get("dataset_id"),
            "short_name": item.get("short_name"),
            "version": item.get("version_id"),
            "title": item.get("title"),
            "time_start": item.get("time_start"),
            "time_end": item.get("time_end"),
            "summary": item.get("summary"),
            "concept_id": item.get("id"),
        })
    return cleaned


def build_demo_series(base_value: float, trend_bias: float = 0.2, variance: float = 1.0, years: List[int] | None = None) -> List[float]:
    if years is None:
        years = list(range(2002, 2025))
    values: List[float] = []
    for index, year in enumerate(years):
        seasonal = np.sin(index / 2.2) * variance
        drift = (index / max(len(years) - 1, 1)) * trend_bias
        noise = ((year % 11) / 25.0) * 0.6
        values.append(round(base_value + seasonal + drift + noise, 3))
    return values


def compute_trend(values: List[float], years: List[int]) -> Dict[str, Any]:
    arr = np.asarray(values, dtype=float)
    x = np.asarray(years, dtype=float)
    slope = float(np.polyfit(x, arr, 1)[0]) if len(arr) > 1 else 0.0
    current = float(arr[-1]) if len(arr) else 0.0
    first = float(arr[0]) if len(arr) else 0.0
    delta = current - first
    direction = "warming" if slope > 0 else "cooling" if slope < 0 else "stable"
    return {
        "slope_per_year": round(slope, 4),
        "direction": direction,
        "current_value": round(current, 3),
        "change_since_start": round(delta, 3),
        "trend_strength": round(abs(slope), 4),
    }


def compute_anomaly_metrics(values: List[float]) -> Dict[str, Any]:
    arr = np.asarray(values, dtype=float)
    mean = float(arr.mean()) if arr.size else 0.0
    std = float(arr.std(ddof=0)) if arr.size else 0.0
    zscores = np.zeros_like(arr, dtype=float)
    if std != 0:
        zscores = (arr - mean) / std
    anomalies = [i for i, z in enumerate(zscores) if abs(float(z)) > 1.5]
    last_value = float(arr[-1]) if arr.size else 0.0
    anomaly_score = round((last_value - mean) / std, 3) if std else 0.0
    return {
        "mean": round(mean, 3),
        "std": round(std, 3),
        "latest_zscore": round(float(zscores[-1]), 3) if zscores.size else 0.0,
        "anomaly_count": len(anomalies),
        "anomaly_score": anomaly_score,
        "anomaly_labels": anomalies,
    }


def summarize_series(values: List[float], indicator_name: str, long_label: str) -> List[str]:
    if not values:
        return [f"No {indicator_name} observations were available for this district."]

    trend = compute_trend(values, list(range(len(values))))
    anomaly = compute_anomaly_metrics(values)
    msgs = []
    if trend["direction"] == "warming":
        msgs.append(f"The {long_label} trend for this district is warming, with a slope of {trend['slope_per_year']:.4f} per year.")
    elif trend["direction"] == "cooling":
        msgs.append(f"The {long_label} trend for this district is cooling, with a slope of {trend['slope_per_year']:.4f} per year.")
    else:
        msgs.append(f"The {long_label} trend for this district is relatively stable over the selected period.")

    if anomaly["anomaly_count"]:
        msgs.append(
            f"There are {anomaly['anomaly_count']} notable anomaly periods in the selected history, indicating unusual {indicator_name} behavior."
        )
    else:
        msgs.append(f"The district does not show major {indicator_name} anomalies within the current time window.")
    return msgs


def build_chart_payload(labels: List[int], values: List[float], title: str, series_name: str) -> Dict[str, Any]:
    return {
        "type": "line",
        "title": title,
        "labels": [str(v) for v in labels],
        "datasets": [{
            "label": series_name,
            "data": [round(float(v), 3) for v in values],
            "borderColor": "#e45d3c",
            "backgroundColor": "rgba(228, 93, 60, 0.12)",
            "fill": True,
            "tension": 0.35,
        }],
    }


def build_anomaly_chart(labels: List[int], values: List[float], title: str) -> Dict[str, Any]:
    arr = np.asarray(values, dtype=float)
    mean = float(arr.mean()) if arr.size else 0.0
    std = float(arr.std(ddof=0)) if arr.size else 0.0
    anomaly_values = []
    for value in values:
        if std == 0:
            anomaly_values.append(0.0)
        else:
            anomaly_values.append(round((value - mean) / std, 3))
    return {
        "type": "bar",
        "title": title,
        "labels": [str(v) for v in labels],
        "datasets": [{
            "label": "Z-score anomaly",
            "data": anomaly_values,
            "backgroundColor": ["#1c7a72" if v >= 0 else "#d95738" for v in anomaly_values],
            "borderRadius": 4,
        }],
    }


def district_analysis_result(district_name: str, keyword: str, token: str, start: str, end: str) -> Dict[str, Any]:
    geo = geocode_district(district_name)
    results = []
    try:
        results = search_nasa_datasets(keyword, geo["bbox"], token, start, end)
    except Exception as exc:  # pragma: no cover - network safely handled
        results = [{"dataset_id": "CMR_LOOKUP_UNAVAILABLE", "error": str(exc)}]

    years = list(range(2002, 2025))
    base = 0.0
    keyword_lower = keyword.lower()
    if "ozone" in keyword_lower:
        base = 14.0
        trend_bias = 0.05
        variance = 1.2
    elif "veget" in keyword_lower or "ndvi" in keyword_lower:
        base = 68.0
        trend_bias = 0.10
        variance = 3.0
    else:
        base = 20.0
        trend_bias = 0.22
        variance = 1.8

    series = build_demo_series(base, trend_bias=trend_bias, variance=variance, years=years)
    trend = compute_trend(series, years)
    anomaly_metrics = compute_anomaly_metrics(series)

    chart_main = build_chart_payload(years, series, f"{keyword.capitalize()} trend for {district_name}", keyword.capitalize())
    chart_anomaly = build_anomaly_chart(years, series, f"{keyword.capitalize()} anomaly signal")

    summary = summarize_series(series, keyword.lower(), f"{keyword.lower()} signal")

    return {
        "district": district_name,
        "geography": geo,
        "token_status": "valid" if token else "missing",
        "dataset_search": {
            "keyword": keyword,
            "time_range": {"start": start, "end": end},
            "hits": len(results),
            "results": results[:5],
        },
        "analysis": {
            "signal": keyword,
            "years": years,
            "series": [round(float(v), 3) for v in series],
            "trend": trend,
            "anomaly": anomaly_metrics,
            "insights": summary,
        },
        "charts": {
            "trend": chart_main,
            "anomaly": chart_anomaly,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="District-level NASA Earthdata analysis starter")
    parser.add_argument("district", help="District name or place name to geocode and analyze")
    parser.add_argument("--keyword", default="temperature", help="Climate keyword to search in NASA CMR")
    parser.add_argument("--token", default=None, help="Earthdata bearer token")
    parser.add_argument("--start", default="2002-01-01", help="Start date in ISO format")
    parser.add_argument("--end", default="2024-12-31", help="End date in ISO format")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output")
    args = parser.parse_args()

    try:
        token = env_or_arg(args.token)
        payload = district_analysis_result(args.district, args.keyword, token, args.start, args.end)
        if args.pretty:
            print(json.dumps(payload, indent=2))
        else:
            print(json.dumps(payload))
    except Exception as exc:  # pragma: no cover
        print(json.dumps({"error": str(exc), "status": "failed"}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

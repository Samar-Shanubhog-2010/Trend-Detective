#!/usr/bin/env python3
"""Minimal backend for the Trend Detective district analysis API.

This file serves a lightweight live endpoint for the front-end dashboard.
It calls the district analysis logic from district_nasa_analysis.py and exposes
JSON over HTTP.
"""

from __future__ import annotations

import argparse
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from district_nasa_analysis import district_analysis_result


DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8001


class DistrictAnalysisHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path != "/api/district-analysis":
            self._send_json(404, {"error": "Not found", "status": "failed"})
            return

        query = parse_qs(parsed.query)
        district = (query.get("district", ["Hyderabad"])[0] or "Hyderabad").strip()
        keyword = (query.get("keyword", ["temperature"])[0] or "temperature").strip() or "temperature"
        start = (query.get("start", ["2002-01-01"])[0] or "2002-01-01").strip()
        end = (query.get("end", ["2024-12-31"])[0] or "2024-12-31").strip()
        token = os.environ.get("EARTHDATA_TOKEN", "")

        try:
            payload = district_analysis_result(district, keyword, token, start, end)
            self._send_json(200, payload)
        except Exception as exc:  # pragma: no cover - backend safety fallback
            self._send_json(500, {"error": str(exc), "status": "failed", "district": district})

    def log_message(self, format: str, *args) -> None:  # noqa: A003 - standard override
        return

    def _send_json(self, status_code: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Trend Detective district analysis backend")
    parser.add_argument("--host", default=DEFAULT_HOST, help="Host to bind to")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="Port to bind to")
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), DistrictAnalysisHandler)
    print(f"District analysis backend running at http://{args.host}:{args.port}/api/district-analysis")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

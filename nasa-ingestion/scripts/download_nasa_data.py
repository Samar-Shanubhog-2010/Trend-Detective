import argparse
import json
import os
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

TOKEN = os.environ.get("EARTHDATA_TOKEN")
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "raw"
OUTPUT_DIR.mkdir(exist_ok=True, parents=True)

CMR_CONCEPT_ID = "C1238517346-GES_DISC"
CMR_PAGE_SIZE = 5


def earthdata_request(url):
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/json",
    }
    request = Request(url, headers=headers)
    with urlopen(request) as response:
        return response.read()


def list_granules():
    search_url = (
        "https://cmr.earthdata.nasa.gov/search/granules.json"
        f"?concept_id={CMR_CONCEPT_ID}&page_num=1&page_size={CMR_PAGE_SIZE}&sort_key[]=start_date"
    )
    payload = earthdata_request(search_url)
    data = json.loads(payload.decode("utf-8"))
    entries = data.get("feed", {}).get("entry", [])
    if not entries:
        raise RuntimeError("No granules found for the requested collection.")
    return entries


def get_data_link(entry):
    for link in entry.get("links", []):
        if link.get("rel") == "http://esipfed.org/ns/fedsearch/1.1/data#":
            return link.get("href")
    return None


def download_granule(granule_url, target_path):
    request = Request(
        granule_url,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Accept": "application/octet-stream",
        },
    )
    with urlopen(request) as response:
        with open(target_path, "wb") as destination:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                destination.write(chunk)


def main():
    parser = argparse.ArgumentParser(description="Download or inspect NASA Earthdata granules.")
    parser.add_argument("--download", action="store_true", help="Download matching files into the raw folder.")
    parser.add_argument("--max-size-mb", type=float, default=20.0, help="Skip files larger than this size in MB when --download is used.")
    args = parser.parse_args()

    if not TOKEN:
        print("EARTHDATA_TOKEN not found in environment.")
        print("Set it first with: set EARTHDATA_TOKEN=your_token")
        sys.exit(1)

    print("Searching NASA CMR for granules...")
    entries = list_granules()
    print(f"Found {len(entries)} granules.")

    for entry in entries:
        title = entry.get("title")
        granule_size = float(entry.get("granule_size", 0) or 0)
        size_mb = granule_size / (1024 * 1024)
        data_link = get_data_link(entry)
        if not data_link:
            continue

        print(f"- {title} | size={size_mb:.2f} MB")
        if not args.download:
            continue

        if size_mb > args.max_size_mb:
            print(f"  Skipping large file ({size_mb:.2f} MB > {args.max_size_mb:.2f} MB). Use a smaller range or pass --download with a larger --max-size-mb.")
            continue

        file_name = os.path.basename(data_link)
        target_path = OUTPUT_DIR / file_name
        print(f"  Downloading: {file_name}")
        download_granule(data_link, target_path)
        print(f"  Saved to: {target_path}")

    if args.download:
        print("Download pass completed.")
    else:
        print("Metadata check complete. Re-run with --download to fetch selected granules.")


if __name__ == "__main__":
    try:
        main()
    except (HTTPError, URLError, RuntimeError) as exc:
        print(f"NASA download failed: {exc}", file=sys.stderr)
        sys.exit(1)

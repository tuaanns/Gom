"""
Download ceramic images from Wikimedia Commons for benchmark dataset.
Uses the Wikimedia Commons API (free, no API key required).
"""

import asyncio
import hashlib
import json
import os
import re
import sys
import urllib.parse
from pathlib import Path

# Configure stdout/stderr to use UTF-8 to prevent encoding errors on Windows
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import httpx

DATASET_DIR = Path(__file__).resolve().parent / "dataset" / "val"

# Search queries for each ceramic type
# Multiple queries per type to increase variety
CERAMIC_SEARCHES = {
    # === VIETNAMESE CERAMICS ===
    "Biên Hòa": [
        "Bien Hoa ceramics",
        "Bien Hoa pottery Vietnam",
    ],
    "Bàu Trúc": [
        "Bau Truc pottery",
        "Bau Truc Cham pottery Vietnam",
    ],
    "Bát Tràng": [
        "Bat Trang ceramics",
        "Bat Trang pottery Vietnam",
    ],
    "Chu Đậu": [
        "Chu Dau ceramics",
        "Chu Dau blue white Vietnam",
    ],
    "Lái Thiêu": [
        "Lai Thieu ceramics",
        "Lai Thieu pottery Vietnam",
    ],
    "Phù Lãng": [
        "Phu Lang pottery",
        "Phu Lang ceramics Vietnam",
    ],
    "Thanh Hà": [
        "Thanh Ha pottery Hoi An",
        "Thanh Ha ceramics Vietnam",
    ],
    "Thổ Hà": [
        "Tho Ha pottery Vietnam",
        "Tho Ha ceramics Bac Giang",
    ],
    "Đông Triều": [
        "Dong Trieu ceramics",
        "Dong Trieu pottery Vietnam",
    ],
    # === INTERNATIONAL CERAMICS ===
    "Jingdezhen": [
        "Jingdezhen porcelain",
        "Jingdezhen blue and white",
        "Jingdezhen vase",
    ],
    "Longquan": [
        "Longquan celadon",
        "Longquan ware",
    ],
    "Arita-Imari": [
        "Imari porcelain",
        "Arita ware",
        "Imari ware plate",
    ],
    "Satsuma": [
        "Satsuma ware",
        "Satsuma pottery vase",
    ],
    "Goryeo Celadon": [
        "Goryeo celadon",
        "Korean celadon",
        "Koryo celadon",
    ],
    "Sawankhalok": [
        "Sawankhalok ceramics",
        "Sawankhalok ware",
        "Si Satchanalai ceramics",
    ],
    "Meissen": [
        "Meissen porcelain",
        "Meissen figurine",
    ],
    "Wedgwood": [
        "Wedgwood jasperware",
        "Wedgwood pottery",
    ],
    "Delftware": [
        "Delftware",
        "Delft blue pottery",
        "Delft tin-glazed",
    ],
    "Iznik": [
        "Iznik pottery",
        "Iznik ceramics tile",
        "Iznik ware",
    ],
}

TARGET_PER_CLASS = 10  # Images per ceramic type


async def search_commons(client: httpx.AsyncClient, query: str, limit: int = 15) -> list[dict]:
    """Search Wikimedia Commons for images."""
    params = {
        "action": "query",
        "list": "search",
        "srsearch": f"{query} filetype:bitmap",
        "srnamespace": "6",  # File namespace
        "srlimit": limit,
        "format": "json",
    }
    try:
        resp = await client.get("https://commons.wikimedia.org/w/api.php", params=params)
        data = resp.json()
        return data.get("query", {}).get("search", [])
    except Exception as e:
        print(f"    Search error: {e}")
        return []


async def get_image_url(client: httpx.AsyncClient, title: str) -> str | None:
    """Get the direct image URL from a Wikimedia Commons file title."""
    params = {
        "action": "query",
        "titles": title,
        "prop": "imageinfo",
        "iiprop": "url|size|mime",
        "format": "json",
    }
    try:
        resp = await client.get("https://commons.wikimedia.org/w/api.php", params=params)
        data = resp.json()
        pages = data.get("query", {}).get("pages", {})
        for page in pages.values():
            info_list = page.get("imageinfo", [])
            if info_list:
                info = info_list[0]
                mime = info.get("mime", "")
                width = info.get("width", 0)
                height = info.get("height", 0)

                # Filter: only JPEG/PNG, reasonable size
                if mime not in ("image/jpeg", "image/png"):
                    return None
                if width < 200 or height < 200:
                    return None
                # Skip very large files (>15MB)
                if info.get("size", 0) > 15_000_000:
                    return None

                return info.get("url")
    except Exception as e:
        print(f"    URL fetch error: {e}")
    return None


async def download_image(client: httpx.AsyncClient, url: str, save_path: Path) -> bool:
    """Download an image from URL."""
    try:
        resp = await client.get(url, follow_redirects=True, timeout=30.0)
        if resp.status_code == 200 and len(resp.content) > 5000:
            with open(save_path, "wb") as f:
                f.write(resp.content)
            return True
    except Exception as e:
        print(f"    Download error: {e}")
    return False


def safe_filename(title: str, ext: str = ".jpg") -> str:
    """Create a safe filename from a Wikimedia title."""
    # Remove "File:" prefix
    name = re.sub(r"^File:", "", title)
    # Remove extension from title
    name = re.sub(r"\.\w+$", "", name)
    # Replace problematic characters
    name = re.sub(r'[\\/:*?"<>|]', "_", name)
    name = name.strip()[:80]  # Limit length
    return name + ext


async def download_for_class(ceramic_name: str, queries: list[str]):
    """Download images for one ceramic class."""
    target_dir = DATASET_DIR / ceramic_name
    target_dir.mkdir(parents=True, exist_ok=True)

    # Check existing images
    existing = [f for f in target_dir.iterdir()
                if f.suffix.lower() in (".jpg", ".jpeg", ".png")]
    if len(existing) >= TARGET_PER_CLASS:
        print(f"  [{ceramic_name}] Already has {len(existing)} images. Skipping.")
        return len(existing)

    needed = TARGET_PER_CLASS - len(existing)
    print(f"  [{ceramic_name}] Have {len(existing)}, need {needed} more...")

    downloaded = 0
    seen_urls = set()

    async with httpx.AsyncClient(timeout=20.0, headers={
        "User-Agent": "GomPotteryBenchmark/1.0 (https://github.com/tuaanns/Gom; admin@gom-ai.org) Python/3.9 httpx/0.24.1"
    }) as client:
        for query in queries:
            if downloaded >= needed:
                break

            print(f"    Searching for '{query}'...")
            results = await search_commons(client, query, limit=12)
            print(f"      Found {len(results)} results.")
            await asyncio.sleep(0.5)  # Be polite to API

            for item in results:
                if downloaded >= needed:
                    break

                title = item.get("title", "")
                if not title:
                    continue

                # Get direct image URL
                url = await get_image_url(client, title)
                if not url:
                    print(f"      Skipped '{title}': URL fetch returned None")
                    continue
                if url in seen_urls:
                    print(f"      Skipped '{title}': URL already seen")
                    continue
                seen_urls.add(url)

                await asyncio.sleep(0.3)

                # Determine extension
                ext = ".jpg"
                if url.lower().endswith(".png"):
                    ext = ".png"

                filename = safe_filename(title, ext)
                save_path = target_dir / filename

                if save_path.exists():
                    print(f"      Skipped '{title}': File already exists at {filename}")
                    continue

                print(f"      Downloading from {url}...")
                success = await download_image(client, url, save_path)
                if success:
                    downloaded += 1
                    size_kb = save_path.stat().st_size / 1024
                    print(f"    [{downloaded}/{needed}] {filename} ({size_kb:.0f} KB)")

                await asyncio.sleep(0.5)

    total = len(existing) + downloaded
    print(f"  [{ceramic_name}] Done! Total: {total} images")
    return total


async def main():
    print("=" * 60)
    print("Downloading international ceramic images")
    print(f"  Source: Wikimedia Commons (Public Domain)")
    print(f"  Target: {DATASET_DIR}")
    print(f"  Target per class: {TARGET_PER_CLASS}")
    print("=" * 60)

    total_downloaded = 0
    for ceramic_name, queries in CERAMIC_SEARCHES.items():
        print()
        count = await download_for_class(ceramic_name, queries)
        total_downloaded += count

    print(f"\n{'='*60}")
    print(f"Done! Total images across all international classes: {total_downloaded}")
    print(f"{'='*60}")

    # Print final summary
    print("\nDataset summary:")
    for d in sorted(DATASET_DIR.iterdir()):
        if d.is_dir():
            imgs = [f for f in d.iterdir()
                    if f.suffix.lower() in (".jpg", ".jpeg", ".png")]
            if imgs:
                print(f"  {d.name}: {len(imgs)} images")


if __name__ == "__main__":
    asyncio.run(main())

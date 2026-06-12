import os
import re
import sys
import shutil
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
import cv2
import yt_dlp

WORKSPACE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = WORKSPACE_DIR / "dataset" / "video_screenshots"
TEMP_DIR = WORKSPACE_DIR / "temp_videos"

SEARCH_QUERIES = [
    # === USER SPECIFIED SEARCH ===
    "video gốm sứ",
    
    # === VIETNAMESE CERAMICS ===
    "gốm sứ Bát Tràng",
    "gốm Chu Đậu cổ",
    "gốm Biên Hòa Nam Bộ",
    "gốm Cham Bàu Trúc",
    "gốm cổ Lái Thiêu",
    
    # === INTERNATIONAL CERAMICS ===
    "Jingdezhen porcelain China",        # Cảnh Đức Trấn - Trung Quốc
    "Longquan celadon pottery",         # Long Tuyền - Trung Quốc
    "Arita Imari porcelain Japan",      # Arita/Imari - Nhật Bản
    "Goryeo Celadon Korean pottery",    # Goryeo Celadon - Hàn Quốc
    "Delftware pottery Netherlands",    # Delftware - Hà Lan
    "Wedgwood jasperware pottery UK",   # Wedgwood - Anh
    "Iznik pottery Turkey"              # Iznik - Thổ Nhĩ Kỳ
]

def search_youtube_videos(query: str, limit: int = 2) -> list[str]:
    """Search YouTube and return video URLs."""
    print(f"Searching YouTube for: '{query}'...")
    encoded_query = urllib.parse.quote(query)
    url = f"https://www.youtube.com/results?search_query={encoded_query}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code != 200:
                print(f"  Failed to fetch search results: HTTP {resp.status_code}")
                return []
            
            # Find all videoIds
            video_ids = re.findall(r"\"videoId\":\"([^\"]+)\"", resp.text)
            video_ids = list(dict.fromkeys(video_ids)) # Remove duplicates
            
            urls = [f"https://www.youtube.com/watch?v={vid}" for vid in video_ids[:limit]]
            print(f"  Found {len(urls)} videos.")
            return urls
    except Exception as e:
        print(f"  Error searching YouTube: {e}")
        return []

def download_video(video_url: str, output_dir: Path) -> Path | None:
    """Download video in lowest quality to save bandwidth and time."""
    print(f"Downloading video: {video_url}...")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    ydl_opts = {
        'format': 'worstvideo[ext=mp4]/worst[ext=mp4]/worst',  # Prefer small mp4 files
        'outtmpl': str(output_dir / '%(id)s.%(ext)s'),
        'quiet': True,
        'no_warnings': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=True)
            filename = ydl.prepare_filename(info)
            # Find the actual downloaded file since extension might vary slightly
            video_path = Path(filename)
            if video_path.exists():
                print(f"  Successfully downloaded to {video_path.name} ({video_path.stat().st_size / (1024*1024):.2f} MB)")
                return video_path
            else:
                # Fallback check if it was downloaded with a different ext
                video_id = info.get("id")
                for f in output_dir.iterdir():
                    if f.stem == video_id:
                        print(f"  Found downloaded file: {f.name} ({f.stat().st_size / (1024*1024):.2f} MB)")
                        return f
    except Exception as e:
        print(f"  Error downloading video: {e}")
    return None

def get_google_api_key() -> str:
    """Read Google API key from environment or .env files."""
    try:
        from dotenv import load_dotenv
        load_dotenv()
        if not os.getenv("GOOGLE_API_KEY"):
            load_dotenv(WORKSPACE_DIR / "gom-ai" / ".env")
    except Exception:
        pass
        
    google_key = os.getenv("GOOGLE_API_KEY")
    if google_key and "," in google_key:
        google_key = google_key.split(",")[0].strip()
    return google_key or ""

def is_ceramic_image(frame, api_key: str) -> bool:
    """Check if the frame actually contains ceramics/pottery using Gemini with retry on rate limit."""
    if not api_key:
        return True  # Fallback if no key is configured
        
    import time
    for attempt in range(3):
        try:
            from google import genai as google_genai
            from google.genai import types as genai_types
            
            # Resize frame to a smaller size to speed up network transmission and save tokens
            h, w = frame.shape[:2]
            max_size = 384
            if max(h, w) > max_size:
                scale = max_size / max(h, w)
                frame_resized = cv2.resize(frame, (int(w * scale), int(h * scale)))
            else:
                frame_resized = frame
                
            _, encoded_img = cv2.imencode(".jpg", frame_resized, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            img_bytes = encoded_img.tobytes()
            
            client = google_genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    genai_types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"),
                    "Does this image clearly show a ceramic/pottery object (such as a vase, pot, plate, bowl, jar, cup, "
                    "figurine, tile, clay pot being shaped on a wheel, or the glazing/firing process)? "
                    "The image MUST be clear, sharp, well-lit, not extremely blurry or out-of-focus, and the ceramic object should be easily recognizable. "
                    "We want to filter out intro screens, title cards, human faces talking (with no pottery visible), text, "
                    "nature scenery, or other unrelated objects. "
                    "Answer with exactly 'YES' or 'NO'."
                ]
            )
            # Sleep 5 seconds after success to respect free tier rate limit (15 RPM)
            time.sleep(5)
            
            answer = response.text.strip().upper() if response.text else ""
            is_val = "YES" in answer
            print(f"    Gemini check: {answer} -> Keep: {is_val}")
            return is_val
            
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                print(f"    Rate limit hit (429). Sleeping 40 seconds before retry (attempt {attempt+1}/3)...")
                time.sleep(40)
                continue
            else:
                print(f"    Gemini check error: {e}")
                return True  # Fallback on other errors to ensure we don't block
                
    return True  # Fallback if all retries exhausted

def extract_frames(video_path: Path, output_dir: Path, num_frames: int, api_key: str) -> int:
    """Extract a specified number of validated ceramic frames from a video file."""
    output_dir.mkdir(parents=True, exist_ok=True)
    video_id = video_path.stem
    
    print(f"Extracting up to {num_frames} ceramic frames from {video_path.name}...")
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"  Failed to open video file: {video_path}")
        return 0
    
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames <= 0:
        print(f"  Invalid frame count: {total_frames}")
        cap.release()
        return 0
    
    # Skip the first 10% and last 10% to avoid intros/outros/black frames
    start_frame = int(total_frames * 0.1)
    end_frame = int(total_frames * 0.9)
    usable_frames = end_frame - start_frame
    
    if usable_frames < 100:
        start_frame = 0
        end_frame = total_frames
        usable_frames = total_frames
        
    # We will sample candidates evenly
    slot_interval = usable_frames // (num_frames + 1)
    
    extracted_count = 0
    for slot in range(num_frames):
        target_frame = start_frame + (slot + 1) * slot_interval
        
        # Try up to 2 attempts per slot (target, and 120 frames/approx 4s later) to stay light on API
        for attempt in range(2):
            curr_frame = target_frame + attempt * 120
            if curr_frame >= end_frame:
                break
                
            cap.set(cv2.CAP_PROP_POS_FRAMES, curr_frame)
            ret, frame = cap.read()
            if not ret:
                continue
                
            # Check with Gemini
            if is_ceramic_image(frame, api_key):
                filename = f"frame_{video_id}_{curr_frame:05d}.jpg"
                save_path = output_dir / filename
                cv2.imwrite(str(save_path), frame, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
                extracted_count += 1
                break
                
    cap.release()
    print(f"  Extracted {extracted_count} screenshots.")
    return extracted_count

def main():
    print("=" * 60)
    print("AUTOMATED CERAMICS VIDEO SCREENSHOT CAPTURER")
    print(f"Output directory: {OUTPUT_DIR}")
    print("=" * 60)

    # 0. Clean or create output directory
    if OUTPUT_DIR.exists():
        print(f"Clearing old screenshots in {OUTPUT_DIR}...")
        for f in OUTPUT_DIR.iterdir():
            if f.is_file():
                try:
                    f.unlink()
                except Exception as e:
                    print(f"  Error deleting {f.name}: {e}")
    else:
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Load API Key
    api_key = get_google_api_key()
    if api_key:
        print("Successfully loaded Google API Key for image validation.")
    else:
        print("Warning: Google API Key not found. Script will capture frames without validation.")

    # 1. Gather video URLs
    video_urls = []
    for query in SEARCH_QUERIES:
        urls = search_youtube_videos(query, limit=2)
        video_urls.extend(urls)
        
    # Remove duplicate URLs if any
    video_urls = list(dict.fromkeys(video_urls))
    print(f"\nTotal unique videos to process: {len(video_urls)}")
    
    if not video_urls:
        print("No videos found! Exiting.")
        return
        
    # Determine frames per video to reach target (100 screenshots) with buffer
    target_total = 100
    frames_per_video = max(1, (target_total + len(video_urls) - 1) // len(video_urls)) + 2
    print(f"Targeting up to {frames_per_video} screenshots per video (with buffer) to reach 100 total.")
    
    # Create temp directory
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    
    total_extracted = 0
    processed_videos = 0
    
    try:
        for url in video_urls:
            if total_extracted >= target_total:
                print(f"\nReached target of {total_extracted} screenshots. Stopping.")
                break
                
            video_path = download_video(url, TEMP_DIR)
            if video_path and video_path.exists():
                needed = target_total - total_extracted
                to_extract = min(frames_per_video, needed)
                
                count = extract_frames(video_path, OUTPUT_DIR, to_extract, api_key)
                total_extracted += count
                processed_videos += 1
                
                # Delete video to save space
                try:
                    video_path.unlink()
                    print(f"  Deleted temp file: {video_path.name}")
                except Exception as e:
                    print(f"  Could not delete temp file: {e}")
                    
            print(f"Current progress: {total_extracted} / {target_total} screenshots")
            
        # Fallback phase if we didn't reach target_total due to rejections
        if total_extracted < target_total:
            print(f"\n[Fallback Phase] Only got {total_extracted}/{target_total} validated screenshots.")
            print("Gathering more videos from generic searches to fill the remaining count...")
            fallback_queries = ["pottery wheel throwing", "ceramic art gallery", "gốm sứ bát tràng", "making pottery vase"]
            fallback_urls = []
            for q in fallback_queries:
                urls = search_youtube_videos(q, limit=3)
                fallback_urls.extend(urls)
            
            # Remove duplicates and already processed video URLs
            fallback_urls = [u for u in list(dict.fromkeys(fallback_urls)) if u not in video_urls]
            
            for url in fallback_urls:
                if total_extracted >= target_total:
                    break
                    
                video_path = download_video(url, TEMP_DIR)
                if video_path and video_path.exists():
                    needed = target_total - total_extracted
                    count = extract_frames(video_path, OUTPUT_DIR, min(8, needed), api_key)
                    total_extracted += count
                    try:
                        video_path.unlink()
                    except Exception:
                        pass
                    print(f"Current progress (fallback): {total_extracted} / {target_total} screenshots")
            
    finally:
        # Cleanup temp directory
        if TEMP_DIR.exists():
            try:
                shutil.rmtree(TEMP_DIR)
                print(f"\nCleaned up temporary directory: {TEMP_DIR}")
            except Exception as e:
                print(f"Error during cleanup: {e}")
                
    print("\n" + "=" * 60)
    print(f"Done! Successfully generated {total_extracted} screenshots in:")
    print(f"  {OUTPUT_DIR}")
    print("=" * 60)

if __name__ == "__main__":
    main()

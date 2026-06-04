import time
import os
import sys
import subprocess
import logging
import re
import shutil
import uuid
import random
import requests as http_requests
from urllib.parse import parse_qs, unquote, urlparse

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

logger = logging.getLogger("gom-ai.lens")


def _normalize_result_url(href: str) -> str:
    if not href:
        return ""

    href = href.strip()
    if href.startswith("/url?"):
        href = "https://www.google.com" + href

    parsed = urlparse(href)
    host = parsed.netloc.lower()

    if "google." in host:
        params = parse_qs(parsed.query)
        for key in ("url", "q", "imgrefurl"):
            values = params.get(key)
            if values:
                candidate = unquote(values[0]).strip()
                if candidate.startswith("http"):
                    return candidate
        return ""

    return href if href.startswith("http") else ""


def _valid_result_url(url: str) -> bool:
    if not url:
        return False
    host = urlparse(url).netloc.lower()
    blocked = ("google.", "gstatic.", "ggpht.", "googleusercontent.", "schema.org")
    return not any(part in host for part in blocked)


def _element_text(el) -> str:
    for attr in ("aria-label", "title"):
        value = (el.get_attribute(attr) or "").strip()
        if value:
            return value
    return (el.text or "").strip()


def _build_chrome_options():
    chrome_options = Options()
    headless = os.getenv("GOOGLE_LENS_HEADLESS", "true").strip().lower() not in {"0", "false", "no", "off"}
    if headless:
        chrome_options.add_argument("--headless=new")
    else:
        # Move browser window off-screen (e.g. at x=-2000) so it is hidden from user's view,
        # yet it remains a fully functional real browser, avoiding CAPTCHA and bot detection.
        chrome_options.add_argument("--window-position=-2000,0")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--lang=vi,en-US;q=0.9,en;q=0.8")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--log-level=3")
    chrome_options.add_argument("--silent")
    return chrome_options


def get_chrome_major_version():
    try:
        import undetected_chromedriver as uc
        chrome_path = uc.find_chrome_executable()
    except Exception:
        chrome_path = None

    version_str = ""

    if sys.platform == "win32":
        import winreg
        for hkey in (winreg.HKEY_CURRENT_USER, winreg.HKEY_LOCAL_MACHINE):
            try:
                key = winreg.OpenKey(hkey, r"Software\Google\Chrome\BLBeacon")
                val, _ = winreg.QueryValueEx(key, "version")
                if val:
                    version_str = val
                    break
            except Exception:
                pass
        
        if not version_str and chrome_path and os.path.exists(chrome_path):
            try:
                import ctypes
                size = ctypes.windll.version.GetFileVersionInfoSizeW(chrome_path, None)
                if size > 0:
                    res = ctypes.create_string_buffer(size)
                    ctypes.windll.version.GetFileVersionInfoW(chrome_path, None, size, res)
                    rVal = ctypes.c_void_p(0)
                    rLen = ctypes.c_uint(0)
                    if ctypes.windll.version.VerQueryValueW(res, "\\", ctypes.byref(rVal), ctypes.byref(rLen)):
                        if rLen.value > 0:
                            import struct
                            info = ctypes.string_at(rVal.value, rLen.value)
                            unpacked = struct.unpack('<IIIIIIIIIIIII', info[:52])
                            file_ver_ms = unpacked[2]
                            file_ver_ls = unpacked[3]
                            major = file_ver_ms >> 16
                            minor = file_ver_ms & 0xFFFF
                            build = file_ver_ls >> 16
                            patch = file_ver_ls & 0xFFFF
                            version_str = f"{major}.{minor}.{build}.{patch}"
            except Exception as e:
                logger.warning(f"[Lens] ctypes version error: {e}")

    else:
        if chrome_path:
            try:
                output = subprocess.check_output([chrome_path, "--version"], stderr=subprocess.STDOUT)
                out_str = output.decode("utf-8", errors="ignore")
                match = re.search(r"(\d+)\.\d+\.\d+\.\d+", out_str)
                if match:
                    version_str = match.group(0)
            except Exception as e:
                logger.warning(f"[Lens] path --version error: {e}")

    if not version_str:
        for cmd in ("google-chrome", "chrome", "chromium", "google-chrome-stable"):
            try:
                output = subprocess.check_output([cmd, "--version"], stderr=subprocess.STDOUT)
                out_str = output.decode("utf-8", errors="ignore")
                match = re.search(r"(\d+)\.\d+\.\d+\.\d+", out_str)
                if match:
                    version_str = match.group(0)
                    break
            except Exception:
                continue

    if version_str:
        match = re.match(r"^(\d+)", version_str)
        if match:
            return int(match.group(1))

    return None


def _upload_to_imgbb(file_path: str) -> str:
    api_key = os.getenv("IMGBB_API_KEY")
    if not api_key:
        return ""
    try:
        with open(file_path, "rb") as f:
            resp = http_requests.post(
                "https://api.imgbb.com/1/upload",
                params={"key": api_key},
                files={"image": f},
                timeout=30
            )
        if resp.status_code == 200:
            data = resp.json()
            url = data.get("data", {}).get("url", "")
            if url:
                logger.info(f"[Lens] ImgBB upload thành công: {url}")
                return url
    except Exception as e:
        logger.warning(f"[Lens] ImgBB upload lỗi: {e}")
    return ""


def setup_driver():
    chrome_options = _build_chrome_options()

    browserless_token = os.getenv("BROWSERLESS_TOKEN")
    if browserless_token:
        browserless_url = os.getenv("BROWSERLESS_WEBDRIVER_URL", "https://chrome.browserless.io/webdriver")
        command_executor = f"{browserless_url}?token={browserless_token}"
        logger.info("[Lens] BROWSERLESS_TOKEN found. Connecting to remote browser...")
        try:
            driver = webdriver.Remote(command_executor=command_executor, options=chrome_options)
            driver.set_page_load_timeout(60)
            return driver
        except Exception as e:
            logger.warning(f"[Lens] Remote browser failed: {e}")
            remote_only = os.getenv("GOOGLE_LENS_REMOTE_ONLY", "false").strip().lower() in {"1", "true", "yes", "on"}
            if remote_only:
                raise

    logger.info("[Lens] Launching local Chrome using undetected_chromedriver...")
    try:
        import undetected_chromedriver as uc
        major_version = get_chrome_major_version()
        if major_version:
            logger.info(f"[Lens] Detected Chrome major version: {major_version}")
            driver = uc.Chrome(options=chrome_options, version_main=major_version)
        else:
            logger.info("[Lens] Chrome major version not detected, letting uc auto-detect")
            driver = uc.Chrome(options=chrome_options)
    except Exception as uc_err:
        logger.warning(f"[Lens] undetected_chromedriver failed to launch: {uc_err}. Falling back to standard selenium...")
        driver = webdriver.Chrome(options=chrome_options)
        stealth_js = "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
        try:
            driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {"source": stealth_js})
        except Exception as cdp_err:
            logger.warning(f"[Lens] Failed to execute CDP stealth script: {cdp_err}")
        
    driver.set_page_load_timeout(60)
    return driver


def _upload_to_catbox(file_path: str) -> str:
    try:
        with open(file_path, "rb") as f:
            resp = http_requests.post(
                "https://catbox.moe/user/api.php",
                data={"reqtype": "fileupload"},
                files={"fileToUpload": (os.path.basename(file_path), f)},
                timeout=30
            )
        if resp.status_code == 200 and resp.text.startswith("http"):
            return resp.text.strip()
    except Exception as e:
        logger.warning(f"[Lens] catbox lỗi: {e}")
    return ""


def _scrape_results(driver, max_results: int) -> list:
    """Cào tất cả link kết quả từ trang Google Lens."""
    results = []

    # Selector chính
    result_selectors = [
        "div[role='listitem']", "div.GNCY8c", "div.VCOFK",
        "div[data-action-url]", "div.Vd9M6", "div.G19kAf",
    ]
    title_selectors = [
        "div[data-item-title='true']", ".m76pS", ".fXU79e",
        "h3", ".UAiK1e", "span.qXLe6d",
    ]

    for rs in result_selectors:
        elements = driver.find_elements(By.CSS_SELECTOR, rs)
        if elements:
            for el in elements:
                try:
                    title = ""
                    for ts in title_selectors:
                        try:
                            t = el.find_element(By.CSS_SELECTOR, ts)
                            title = t.text.strip()
                            if title:
                                break
                        except:
                            continue
                    try:
                        link_el = el.find_element(By.TAG_NAME, "a")
                    except:
                        link_el = el
                    href = _normalize_result_url(link_el.get_attribute("href") or "")
                    if not title:
                        title = _element_text(link_el)
                    if href and title and _valid_result_url(href) and len(title) > 3:
                        if not any(r['url'] == href for r in results):
                            results.append({"title": title, "url": href})
                            if len(results) >= max_results:
                                return results
                except:
                    continue
        if results:
            return results

    # Fallback: tất cả link ngoài Google
    all_links = driver.find_elements(By.TAG_NAME, "a")
    for link in all_links:
        try:
            href = _normalize_result_url(link.get_attribute("href") or "")
            title = _element_text(link)
            if (href and title
                    and _valid_result_url(href)
                    and not href.startswith("javascript")
                    and len(title) > 5):
                if not any(r['url'] == href for r in results):
                    results.append({"title": title, "url": href})
                    logger.info(f"[Lens] ✓ {title[:80]}")
                    if len(results) >= max_results:
                        break
        except:
            continue

    if not results:
        page_source = driver.page_source or ""
        encoded_urls = re.findall(r"https?%3A%2F%2F[^\"'&<>\\]+", page_source)
        plain_urls = re.findall(r"https?://[^\"'<>\\\s]+", page_source)
        for raw in encoded_urls + plain_urls:
            href = _normalize_result_url(unquote(raw))
            if not _valid_result_url(href):
                continue
            host = urlparse(href).netloc.lower().replace("www.", "")
            if not host:
                continue
            if not any(r["url"] == href for r in results):
                results.append({"title": host, "url": href})
                if len(results) >= max_results:
                    break
    return results


def search_google_lens(image_path: str, max_results: int = 10):
    driver = None
    safe_path = None
    try:
        abs_path = os.path.abspath(image_path)
        if not os.path.exists(abs_path):
            return []

        # Copy sang tên ASCII
        ext = os.path.splitext(abs_path)[1] or ".jpg"
        safe_name = f"lens_{uuid.uuid4().hex[:8]}{ext}"
        safe_path = os.path.join(os.path.dirname(abs_path), safe_name)
        shutil.copy2(abs_path, safe_path)
        safe_path = os.path.abspath(safe_path)

        # Upload ảnh lên máy chủ công khai
        public_url = ""
        # 1. Thử ImgBB trước nếu có cấu hình API Key
        if os.getenv("IMGBB_API_KEY"):
            logger.info("[Lens] Upload ảnh lên ImgBB...")
            public_url = _upload_to_imgbb(safe_path)
            
        # 2. Fallback về Catbox nếu không có ImgBB hoặc ImgBB lỗi
        if not public_url:
            logger.info("[Lens] Upload ảnh lên catbox...")
            public_url = _upload_to_catbox(safe_path)
            
        if not public_url:
            logger.warning("[Lens] Không thể upload ảnh lên bất kỳ dịch vụ nào! (Vui lòng kiểm tra mạng hoặc cấu hình IMGBB_API_KEY)")
            return []
        logger.info(f"[Lens] ✓ URL ảnh công khai: {public_url}")

        # Mở Chrome
        driver = setup_driver()

        # === CÁCH MỚI: Truy cập Google Lens trực tiếp bằng URL ===
        # Thay vì: Mở Google → Click Lens → Dán URL
        # Giờ: Truy cập thẳng URL Lens với ảnh
        from urllib.parse import quote
        lens_url = f"https://lens.google.com/uploadbyurl?url={quote(public_url, safe='')}"
        logger.info(f"[Lens] Truy cập trực tiếp: {lens_url[:100]}")
        
        try:
            driver.get(lens_url)
        except Exception as e:
            logger.warning(f"[Lens] Timeout load trang, thử tiếp: {e}")
        
        time.sleep(15)
        
        current_url = driver.current_url
        logger.info(f"[Lens] URL hiện tại: {current_url[:120]}")

        # Kiểm tra 403
        page_source = driver.page_source
        if "403" in page_source and "Forbidden" in page_source:
            logger.warning("[Lens] 403 trên lens.google.com, thử cách 2: qua google.com...")
            
            # Cách 2: Mở Google → Click Lens → Dán URL (backup)
            driver.get("https://www.google.com")
            time.sleep(3)
            wait = WebDriverWait(driver, 15)
            
            selectors = [
                "div[aria-label='Tìm kiếm bằng hình ảnh']",
                "div[aria-label='Search by image']",
                "div[jsname='R5mgy']",
            ]
            for sel in selectors:
                try:
                    btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, sel)))
                    driver.execute_script("arguments[0].click();", btn)
                    logger.info("[Lens] ✓ Click Lens")
                    break
                except:
                    continue
            
            time.sleep(2)
            
            # Tìm ô URL và dán
            from selenium.webdriver.common.keys import Keys
            all_inputs = driver.find_elements(By.CSS_SELECTOR, "input")
            for inp in all_inputs:
                inp_type = (inp.get_attribute("type") or "").lower()
                if inp_type in ["file", "hidden", "submit", "button", "checkbox", "radio"]:
                    continue
                placeholder = (inp.get_attribute("placeholder") or "").lower()
                if any(kw in placeholder for kw in ["url", "link", "liên kết", "đường", "paste"]):
                    inp.clear()
                    inp.send_keys(public_url)
                    time.sleep(0.5)
                    inp.send_keys(Keys.RETURN)
                    logger.info("[Lens] ✓ Dán URL")
                    break
            
            time.sleep(15)
            current_url = driver.current_url

        # CAPTCHA
        if "/sorry/" in current_url:
            logger.warning("[Lens] CAPTCHA! Chờ 60s...")
            for _ in range(60):
                time.sleep(1)
                if "/sorry/" not in driver.current_url:
                    break
            time.sleep(5)

        # Cào kết quả
        results = _scrape_results(driver, max_results)
        
        if not results:
            # Thử refresh
            try:
                driver.refresh()
                time.sleep(8)
                results = _scrape_results(driver, max_results)
            except:
                pass

        if results:
            logger.info(f"[Lens] ✅ {len(results)} kết quả!")
        else:
            logger.warning("[Lens] ⚠ Không có kết quả")
            try:
                driver.save_screenshot("lens_debug_screenshot.png")
                with open("lens_debug_page.html", "w", encoding="utf-8") as f:
                    f.write(driver.page_source)
            except:
                pass

        return results

    except Exception as e:
        import traceback
        logger.error(f"[Lens] Lỗi: {e}\n{traceback.format_exc()}")
        if driver:
            try:
                driver.save_screenshot("lens_debug_screenshot.png")
            except:
                pass
        return []
    finally:
        if safe_path and os.path.exists(safe_path):
            try:
                os.remove(safe_path)
            except:
                pass
        if driver:
            try:
                driver.quit()
            except:
                pass


def analyze_lens_keywords(lens_results: list) -> str:
    if not lens_results:
        return ""
    
    # Define mapping of keywords to ceramic lines and details
    mappings = {
        # Việt Nam
        "chu đậu": ("Chu Dau", "Việt Nam", "Thế kỷ 15 (Thời Lê sơ)", "Gốm Chu Đậu cổ, hoa văn vẽ lam hoặc vẽ nhiều màu dưới men"),
        "chu dau": ("Chu Dau", "Việt Nam", "Thế kỷ 15 (Thời Lê sơ)", "Gốm Chu Đậu cổ, hoa văn vẽ lam hoặc vẽ nhiều màu dưới men"),
        "cù lao chàm": ("Chu Dau", "Việt Nam", "Thế kỷ 15 (Thời Lê sơ)", "Gốm cổ Chu Đậu trục vớt từ tàu đắm Cù Lao Chàm"),
        "cu lao cham": ("Chu Dau", "Việt Nam", "Thế kỷ 15 (Thời Lê sơ)", "Gốm cổ Chu Đậu trục vớt từ tàu đắm Cù Lao Chàm"),
        "thiên nga": ("Chu Dau", "Việt Nam", "Thế kỷ 15 (Thời Lê sơ)", "Bình gốm Chu Đậu vẽ thiên nga / Bảo vật quốc gia"),
        "bình tỳ bà": ("Chu Dau", "Việt Nam", "Thế kỷ 15 (Thời Lê sơ)", "Bình tỳ bà gốm Chu Đậu cổ"),
        "bình tì bà": ("Chu Dau", "Việt Nam", "Thế kỷ 15 (Thời Lê sơ)", "Bình tỳ bà gốm Chu Đậu cổ"),
        
        "bát tràng": ("Bat Trang", "Việt Nam", "Thế kỷ 14 đến nay", "Gốm sứ Bát Tràng"),
        "bat trang": ("Bat Trang", "Việt Nam", "Thế kỷ 14 đến nay", "Gốm sứ Bát Tràng"),
        "men rạn": ("Bat Trang", "Việt Nam", "Thế kỷ 16 đến nay", "Gốm men rạn Bát Tràng cổ"),
        
        "phù lãng": ("Phu Lang", "Việt Nam", "Thế kỷ 14 đến nay", "Gốm Phù Lãng men da lươn"),
        "phu lang": ("Phu Lang", "Việt Nam", "Thế kỷ 14 đến nay", "Gốm Phù Lãng men da lươn"),
        
        "lái thiêu": ("Lai Thieu", "Việt Nam", "Thế kỷ 19-20", "Gốm Lái Thiêu Nam Bộ"),
        "lai thieu": ("Lai Thieu", "Việt Nam", "Thế kỷ 19-20", "Gốm Lái Thiêu Nam Bộ"),
        
        "biên hòa": ("Bien Hoa", "Việt Nam", "Thế kỷ 19-20", "Gốm Biên Hòa"),
        "bien hoa": ("Bien Hoa", "Việt Nam", "Thế kỷ 19-20", "Gốm Biên Hòa"),
        
        "gò sành": ("Go Sanh", "Việt Nam", "Thế kỷ 15 (Chăm pa)", "Gốm Gò Sành Bình Định thời Chăm Pa"),
        "go sanh": ("Go Sanh", "Việt Nam", "Thế kỷ 15 (Chăm pa)", "Gốm Gò Sành Bình Định thời Chăm Pa"),
        
        "cây mai": ("Cay Mai", "Việt Nam", "Thế kỷ 19-20", "Gốm Cây Mai Sài Gòn xưa"),
        "cay mai": ("Cay Mai", "Việt Nam", "Thế kỷ 19-20", "Gốm Cây Mai Sài Gòn xưa"),
        
        "thanh hà": ("Thanh Ha", "Việt Nam", "Thế kỷ 15 đến nay", "Gốm Thanh Hà Hội An"),
        "thanh ha": ("Thanh Ha", "Việt Nam", "Thế kỷ 15 đến nay", "Gốm Thanh Hà Hội An"),
        
        "bầu trúc": ("Bau Truc", "Việt Nam", "Thời tiền sử đến nay", "Gốm mộc vuốt tay Bàu Trúc nung lộ thiên"),
        "bau truc": ("Bau Truc", "Việt Nam", "Thời tiền sử đến nay", "Gốm mộc vuốt tay Bàu Trúc nung lộ thiên"),
        
        "thổ hà": ("Tho Ha", "Việt Nam", "Thế kỷ 14-20", "Gốm sành Thổ Hà Bắc Giang xưa"),
        "tho ha": ("Tho Ha", "Việt Nam", "Thế kỷ 14-20", "Gốm sành Thổ Hà Bắc Giang xưa"),
        
        # Trung Quốc
        "cảnh đức trấn": ("Jingdezhen", "Trung Quốc", "Đường, Tống, Nguyên, Minh, Thanh", "Gốm sứ Cảnh Đức Trấn Trung Quốc"),
        "jingdezhen": ("Jingdezhen", "Trung Quốc", "Đường, Tống, Nguyên, Minh, Thanh", "Gốm sứ Cảnh Đức Trấn Trung Quốc"),
        
        "longquan": ("Longquan", "Trung Quốc", "Tống, Nguyên, Minh", "Gốm men ngọc Long Tuyền celadon"),
        "long tuyền": ("Longquan", "Trung Quốc", "Tống, Nguyên, Minh", "Gốm men ngọc Long Tuyền celadon"),
        
        "dehua": ("Dehua", "Trung Quốc", "Minh, Thanh", "Sứ trắng Đức Hóa (Blanc de Chine)"),
        "đức hóa": ("Dehua", "Trung Quốc", "Minh, Thanh", "Sứ trắng Đức Hóa (Blanc de Chine)"),
        
        "yixing": ("Yixing", "Trung Quốc", "Minh, Thanh đến nay", "Đất nung Nghi Hưng / Ấm Tử Sa"),
        "nghi hưng": ("Yixing", "Trung Quốc", "Minh, Thanh đến nay", "Đất nung Nghi Hưng / Ấm Tử Sa"),
        
        "cizhou": ("Cizhou", "Trung Quốc", "Tống, Kim, Nguyên", "Gốm Từ Châu vẽ nâu đen trên nền trắng"),
        "từ châu": ("Cizhou", "Trung Quốc", "Tống, Kim, Nguyên", "Gốm Từ Châu vẽ nâu đen trên nền trắng"),
        
        # Nhật Bản
        "imari": ("Arita/Imari", "Nhật Bản", "Thế kỷ 17 đến nay", "Gốm sứ Imari / Arita Nhật Bản"),
        "arita": ("Arita/Imari", "Nhật Bản", "Thế kỷ 17 đến nay", "Gốm sứ Arita Nhật Bản"),
        "satsuma": ("Satsuma", "Nhật Bản", "Thế kỷ 16 đến nay", "Gốm Satsuma Nhật Bản"),
        "kutani": ("Kutani", "Nhật Bản", "Thế kỷ 17 đến nay", "Gốm sứ Kutani Nhật Bản"),
        "raku": ("Raku", "Nhật Bản", "Thế kỷ 16 đến nay", "Gốm Raku trà đạo Nhật Bản"),
        "bizen": ("Bizen", "Nhật Bản", "Thế kỷ 14 đến nay", "Gốm mộc Bizen nung củi"),
        "hagi": ("Hagi", "Nhật Bản", "Thế kỷ 16 đến nay", "Gốm Hagi trà đạo Nhật Bản"),
        "mashiko": ("Mashiko", "Nhật Bản", "Thế kỷ 19 đến nay", "Gốm Mashiko mingei Nhật Bản"),
        "shigaraki": ("Shigaraki", "Nhật Bản", "Thế kỷ 13 đến nay", "Gốm Shigaraki nung củi Nhật Bản"),
        "mino": ("Mino", "Nhật Bản", "Thế kỷ 15 đến nay", "Gốm Mino Nhật Bản (Shino, Oribe, Setoguro)"),
        "oribe": ("Mino", "Nhật Bản", "Thế kỷ 16 đến nay", "Gốm Oribe men xanh đồng Nhật Bản"),
        "karatsu": ("Karatsu", "Nhật Bản", "Thế kỷ 16 đến nay", "Gốm Karatsu Nhật Bản"),
        "tokoname": ("Tokoname", "Nhật Bản", "Thế kỷ 12 đến nay", "Gốm Tokoname ấm trà Nhật Bản"),
        
        # Đông Nam Á
        "sawankhalok": ("Sawankhalok", "Thái Lan", "Thế kỷ 14-16", "Gốm Sawankhalok Thái Lan cổ"),
        "sukhothai": ("Sukhothai", "Thái Lan", "Thế kỷ 14-16", "Gốm Sukhothai Thái Lan cổ"),
        "bencharong": ("Bencharong", "Thái Lan", "Thế kỷ 18-19", "Gốm sứ ngũ sắc Bencharong Thái Lan hoàng gia"),
        "khmer": ("Khmer", "Campuchia", "Thế kỷ 9-13", "Gốm Khmer cổ Đế quốc Angkor"),
        
        # Hàn Quốc
        "goryeo": ("Goryeo celadon", "Hàn Quốc", "Thế kỷ 10-14", "Gốm men ngọc Cao Ly (Goryeo Celadon)"),
        "buncheong": ("Buncheong", "Hàn Quốc", "Thế kỷ 15-16", "Gốm Buncheong Hàn Quốc"),
        "joseon": ("Joseon white porcelain", "Hàn Quốc", "Thế kỷ 14-19", "Sứ trắng Triều Tiên thời Joseon"),
        
        # Trung Quốc bổ sung
        "jun ware": ("Jun", "Trung Quốc", "Tống, Nguyên", "Gốm Jun Quân diêu men hỏa biến"),
        "quân diêu": ("Jun", "Trung Quốc", "Tống, Nguyên", "Gốm Jun Quân diêu men hỏa biến"),
        "ge ware": ("Ge", "Trung Quốc", "Tống", "Gốm Ge Cáp diêu men rạn"),
        "ding ware": ("Ding", "Trung Quốc", "Tống", "Gốm Định men trắng ngà Trung Quốc"),
        "ru ware": ("Ru", "Trung Quốc", "Bắc Tống", "Gốm Nhữ men ngọc bích Bắc Tống"),
        "yaozhou": ("Yaozhou", "Trung Quốc", "Tống, Kim", "Gốm Diêu Châu men ngọc khắc hoa"),
        "diêu châu": ("Yaozhou", "Trung Quốc", "Tống, Kim", "Gốm Diêu Châu men ngọc khắc hoa"),
        "blanc de chine": ("Dehua", "Trung Quốc", "Minh, Thanh", "Sứ trắng Đức Hóa (Blanc de Chine)"),
        "blue and white": ("Jingdezhen", "Trung Quốc", "Nguyên, Minh, Thanh", "Sứ hoa lam Cảnh Đức Trấn"),
        "hoa lam": ("Jingdezhen", "Trung Quốc", "Nguyên, Minh, Thanh", "Sứ hoa lam Cảnh Đức Trấn"),
        "tử sa": ("Yixing", "Trung Quốc", "Minh, Thanh đến nay", "Ấm Tử Sa Nghi Hưng"),
        "zisha": ("Yixing", "Trung Quốc", "Minh, Thanh đến nay", "Ấm Tử Sa Nghi Hưng"),
        "famille rose": ("Jingdezhen", "Trung Quốc", "Thanh (Khang Hy đến nay)", "Sứ Phấn Thái / Famille Rose Cảnh Đức Trấn"),
        "famille verte": ("Jingdezhen", "Trung Quốc", "Thanh (Khang Hy)", "Sứ Ngũ Thái / Famille Verte Cảnh Đức Trấn"),
        
        # Châu Âu
        "delft": ("Delftware", "Hà Lan", "Thế kỷ 17 đến nay", "Gốm sứ Delft lam trắng"),
        "delftware": ("Delftware", "Hà Lan", "Thế kỷ 17 đến nay", "Gốm sứ Delft lam trắng"),
        "meissen": ("Meissen", "Đức", "Thế kỷ 18 đến nay", "Sứ cổ Meissen Đức"),
        "sèvres": ("Sèvres", "Pháp", "Thế kỷ 18 đến nay", "Sứ cổ Sèvres Pháp"),
        "sevres": ("Sèvres", "Pháp", "Thế kỷ 18 đến nay", "Sứ cổ Sèvres Pháp"),
        "wedgwood": ("Wedgwood", "Anh", "Thế kỷ 18 đến nay", "Gốm sứ Wedgwood Anh (Jasperware)"),
        "jasperware": ("Wedgwood", "Anh", "Thế kỷ 18 đến nay", "Gốm Jasperware Wedgwood"),
        "limoges": ("Limoges", "Pháp", "Thế kỷ 18 đến nay", "Sứ trắng cao cấp Limoges Pháp"),
        "royal copenhagen": ("Royal Copenhagen", "Đan Mạch", "Thế kỷ 18 đến nay", "Sứ vẽ tay lam Đan Mạch"),
        "royal doulton": ("Royal Doulton", "Anh", "Thế kỷ 19 đến nay", "Sứ Royal Doulton Anh"),
        "herend": ("Herend", "Hungary", "Thế kỷ 19 đến nay", "Sứ vẽ tay Herend Hungary"),
        "majolica": ("Majolica", "Ý/Tây Ban Nha", "Thế kỷ 15 đến nay", "Gốm tráng men thiếc Majolica"),
        "deruta": ("Majolica", "Ý", "Thế kỷ 15 đến nay", "Gốm truyền thống Deruta Ý"),
        "talavera": ("Talavera", "Mexico/Tây Ban Nha", "Thế kỷ 16 đến nay", "Gốm Talavera tráng men đa sắc"),
        "capodimonte": ("Capodimonte", "Ý", "Thế kỷ 18 đến nay", "Sứ Capodimonte đắp nổi hoa lá Ý"),
        "rosenthal": ("Rosenthal", "Đức", "Thế kỷ 19 đến nay", "Sứ Rosenthal Đức"),
        "spode": ("Spode", "Anh", "Thế kỷ 18 đến nay", "Sứ Spode / Copeland Anh"),
        "minton": ("Minton", "Anh", "Thế kỷ 18 đến nay", "Sứ Minton majolica Anh"),
        
        # Trung Đông
        "iznik": ("Iznik", "Thổ Nhĩ Kỳ", "Thế kỷ 15-17", "Gốm Iznik Thổ Nhĩ Kỳ hoa văn Hồi giáo"),
        "kashi": ("Kashi", "Ba Tư/Iran", "Thế kỷ 12-17", "Gốm Kashi Ba Tư luster"),
        "persian": ("Persian pottery", "Ba Tư/Iran", "Thế kỷ 10-17", "Gốm Ba Tư cổ"),
        
        # Mỹ Latinh & Khác
        "barro negro": ("Barro Negro", "Mexico", "Thế kỷ 15 đến nay", "Gốm mộc màu đen bóng Oaxaca Mexico"),
        "mata ortiz": ("Mata Ortiz", "Mexico", "Thế kỷ 20 đến nay", "Gốm đắp vẽ Mata Ortiz Chihuahua Mexico"),
        "pueblo": ("Pueblo", "Hoa Kỳ", "Truyền thống bản địa", "Gốm Pueblo người Mỹ bản địa"),
    }
    
    # Define mapping of country indicators
    country_indicators = {
        "việt nam": "Việt Nam (Vietnam)",
        "vietnam": "Việt Nam (Vietnam)",
        "vietnamese": "Việt Nam (Vietnam)",
        
        "trung quốc": "Trung Quốc (China)",
        "china": "Trung Quốc (China)",
        "chinese": "Trung Quốc (China)",
        
        "nhật bản": "Nhật Bản (Japan)",
        "japan": "Nhật Bản (Japan)",
        "japanese": "Nhật Bản (Japan)",
        
        "thái lan": "Thái Lan (Thailand)",
        "thailand": "Thái Lan (Thailand)",
        "thai": "Thái Lan (Thailand)",
        
        "hàn quốc": "Hàn Quốc (Korea)",
        "korea": "Hàn Quốc (Korea)",
        "korean": "Hàn Quốc (Korea)",
        
        "hà lan": "Hà Lan (Netherlands/Dutch)",
        "dutch": "Hà Lan (Netherlands/Dutch)",
        "delft": "Hà Lan (Netherlands/Dutch)",
        
        "nước đức": "Đức (Germany/German)",
        "germany": "Đức (Germany/German)",
        "german": "Đức (Germany/German)",
        
        "nước pháp": "Pháp (France/French)",
        "france": "Pháp (France/French)",
        "french": "Pháp (France/French)",
        "limoges": "Pháp (France/French)",
        
        "nước anh": "Anh (England/UK/British)",
        "england": "Anh (England/UK/British)",
        "english": "Anh (England/UK/British)",
        "wedgwood": "Anh (England/UK/British)",
        
        "ý": "Ý (Italy/Italian)",
        "italy": "Ý (Italy/Italian)",
        "italian": "Ý (Italy/Italian)",
        
        "tây ban nha": "Tây Ban Nha (Spain/Spanish)",
        "spain": "Tây Ban Nha (Spain/Spanish)",
        "spanish": "Tây Ban Nha (Spain/Spanish)",
        
        "mexico": "Mexico (Mexican)",
        "mexican": "Mexico (Mexican)",
        
        "thổ nhĩ kỳ": "Thổ Nhĩ Kỳ (Turkey/Turkish)",
        "turkey": "Thổ Nhĩ Kỳ (Turkey/Turkish)",
        "turkish": "Thổ Nhĩ Kỳ (Turkey/Turkish)",
        "iznik": "Thổ Nhĩ Kỳ (Turkey/Turkish)",
        
        "hungary": "Hungary (Hungarian)",
        "hungarian": "Hungary (Hungarian)",
        
        "ba tư": "Ba Tư / Iran (Persian/Iranian)",
        "iran": "Ba Tư / Iran (Persian/Iranian)",
        "persian": "Ba Tư / Iran (Persian/Iranian)",
        
        "campuchia": "Campuchia (Cambodia/Khmer)",
        "cambodia": "Campuchia (Cambodia/Khmer)",
        "khmer": "Campuchia (Cambodia/Khmer)",
        
        "đan mạch": "Đan Mạch (Denmark/Danish)",
        "denmark": "Đan Mạch (Denmark/Danish)",
        "danish": "Đan Mạch (Denmark/Danish)",
    }

    # Define ceramic type/material indicators
    material_indicators = {
        "celadon": "Men ngọc (Celadon)",
        "men ngọc": "Men ngọc (Celadon)",
        "porcelain": "Sứ (Porcelain)",
        "đất nung": "Đất nung / Gốm mộc (Earthenware/Terracotta)",
        "terracotta": "Đất nung / Gốm mộc (Earthenware/Terracotta)",
        "stoneware": "Sành / Gốm đá (Stoneware)",
        "gốm sành": "Sành / Gốm đá (Stoneware)",
        "majolica": "Gốm tráng men thiếc đa sắc (Majolica)",
        "faience": "Gốm tráng men Faience",
        "slipware": "Gốm phủ đất sét màu (Slipware)",
        "raku": "Gốm Raku nung nhanh (Raku)",
        "bone china": "Sứ xương / Bone China",
        "tin-glazed": "Gốm tráng men thiếc (Tin-glazed)",
        "salt-glazed": "Gốm men muối (Salt-glazed)",
        "creamware": "Sứ men kem (Creamware)",
        "jasperware": "Gốm Jasperware (Wedgwood)",
    }
    
    ceramic_matches = {}
    country_matches = {}
    material_matches = {}
    
    for r in lens_results:
        text = f"{r.get('title', '')} {r.get('url', '')}".lower()
        
        # Check specific ceramic line mapping
        for kw, info in mappings.items():
            if kw in text:
                ceramic_matches[info] = ceramic_matches.get(info, 0) + 1
        
        # Check country indicators
        for kw, country in country_indicators.items():
            if kw in text:
                country_matches[country] = country_matches.get(country, 0) + 1
                
        # Check material/type indicators
        for kw, mat in material_indicators.items():
            if kw in text:
                material_matches[mat] = material_matches.get(mat, 0) + 1
                
    if not ceramic_matches and not country_matches and not material_matches:
        return ""
        
    analysis_str = "\n--- GOOGLE LENS REVERSE-IMAGE DETECTED SIGNALS ---\n"
    
    if ceramic_matches:
        analysis_str += "1. SPECIFIC CERAMIC LINE MATCHES:\n"
        sorted_ceramics = sorted(ceramic_matches.items(), key=lambda x: x[1], reverse=True)
        for info, count in sorted_ceramics:
            line, country, era, desc = info
            analysis_str += f"   - Match for '{line}' ({desc}): found {count} time(s). Expected Country: {country}, Expected Era: {era}\n"
            
    if country_matches:
        analysis_str += "2. GEOGRAPHIC / ORIGIN SIGNALS:\n"
        sorted_countries = sorted(country_matches.items(), key=lambda x: x[1], reverse=True)
        for country, count in sorted_countries:
            analysis_str += f"   - Origin related to '{country}': {count} mention(s) in titles.\n"
            
    if material_matches:
        analysis_str += "3. MATERIAL / TYPOLOGY SIGNALS:\n"
        sorted_materials = sorted(material_matches.items(), key=lambda x: x[1], reverse=True)
        for mat, count in sorted_materials:
            analysis_str += f"   - Material category '{mat}': {count} mention(s).\n"
            
    # Compute consensus strength
    top_ceramic = None
    top_count = 0
    if ceramic_matches:
        sorted_ceramics_list = sorted(ceramic_matches.items(), key=lambda x: x[1], reverse=True)
        top_ceramic_info, top_count = sorted_ceramics_list[0]
        top_ceramic = top_ceramic_info[0]  # ceramic line name
    
    analysis_str += (
        "\nHOW TO USE THESE SIGNALS (REFERENCE MATERIAL — NOT PRIMARY SOURCE):\n"
        "These Google Lens signals are provided as REFERENCE MATERIAL to help you verify your own expert analysis "
        "and prevent hallucination. They are NOT the primary basis for your prediction.\n\n"
        "GUIDELINES:\n"
        "1. FORM YOUR OWN OPINION FIRST: Analyze the visual evidence using your specialized expertise BEFORE "
        "considering these Lens signals. Your expert knowledge should drive the prediction.\n"
        "2. USE LENS TO VERIFY: After forming your initial analysis, check if these signals support or contradict "
        "your conclusion. If they confirm your analysis, your confidence can increase. If they contradict, "
        "re-examine your reasoning but do NOT automatically change your prediction — Lens matches visually similar items "
        "which may not be the same ceramic line.\n"
        "3. GEOGRAPHIC CONSISTENCY: If you identify a ceramic line, ensure the country and era are consistent. "
        "Do NOT mix origins (e.g., do not predict 'Limoges porcelain from England').\n"
        "4. GLOBAL SCALE: Treat all ceramic traditions with equal weight based on the visual evidence.\n"
    )
    if top_ceramic and top_count >= 3:
        analysis_str += f"📋 NOTE: '{top_ceramic}' appeared in {top_count} separate Lens results — worth considering as supporting evidence for your analysis.\n"
    elif top_ceramic and top_count >= 2:
        analysis_str += f"📋 NOTE: '{top_ceramic}' appeared in {top_count} Lens results — may be relevant as a reference point.\n"
    analysis_str += (
        "5. REMEMBER: You are the expert. Google Lens is a search engine tool, not a ceramic specialist. "
        "Trust your training and analysis methodology over raw search results.\n"
    )
    analysis_str += "---------------------------------------------------\n\n"
    return analysis_str

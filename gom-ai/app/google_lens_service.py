import time
import os
import logging
import shutil
import uuid
import random
import requests as http_requests

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

logger = logging.getLogger("gom-ai.lens")


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
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option("useAutomationExtension", False)
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--lang=vi,en-US;q=0.9,en;q=0.8")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--log-level=3")
    chrome_options.add_argument("--silent")
    return chrome_options


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

    logger.info("[Lens] Launching local Chrome...")
    driver = webdriver.Chrome(options=chrome_options)
    stealth_js = "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
    driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {"source": stealth_js})
        
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
                    href = link_el.get_attribute("href") or ""
                    if not title:
                        title = link_el.text.strip()
                    if href and title and "google" not in href.lower() and len(title) > 3:
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
            href = link.get_attribute("href") or ""
            title = link.text.strip()
            if (href and title
                    and "google" not in href.lower()
                    and "gstatic" not in href.lower()
                    and "about.google" not in href
                    and not href.startswith("javascript")
                    and len(title) > 5):
                if not any(r['url'] == href for r in results):
                    results.append({"title": title, "url": href})
                    logger.info(f"[Lens] ✓ {title[:80]}")
                    if len(results) >= max_results:
                        break
        except:
            continue
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

        # Upload lên catbox
        logger.info("[Lens] Upload ảnh lên catbox...")
        public_url = _upload_to_catbox(safe_path)
        if not public_url:
            return []
        logger.info(f"[Lens] ✓ URL: {public_url}")

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

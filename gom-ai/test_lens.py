import time
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options

def test():
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    driver = webdriver.Chrome(options=chrome_options)
    try:
        driver.get("https://www.google.com")
        time.sleep(2)
        btn = driver.find_element(By.CSS_SELECTOR, "div[aria-label='Tìm kiếm bằng hình ảnh'], div[aria-label='Search by image']")
        btn.click()
        time.sleep(2)
        inp = driver.find_element(By.CSS_SELECTOR, "input[type='file']")
        inp.send_keys(os.path.abspath("uploads/aganoyaki-2048x1365.jpg"))
        time.sleep(5)
        print("URL after upload:", driver.current_url)
    except Exception as e:
        print("Error:", e)
    finally:
        driver.quit()

if __name__ == "__main__":
    test()

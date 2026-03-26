import os
import time
import requests
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from urllib.parse import urljoin

def get_driver():
    options = Options()
    options.add_argument('window-size=1920x1080')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    # options.add_argument('--headless') # Uncomment for headless mode
    
    service = ChromeService()
    driver = webdriver.Chrome(service=service, options=options)
    return driver

def download_kra_pdfs(meet_id=3):
    """
    Downloads PDF files from KRA ChulmaDetailInfoList page using Selenium.
    meet_id: 1=Seoul, 2=Jeju, 3=Busan
    """
    base_url = "https://race.kra.co.kr"
    target_url = f"{base_url}/chulmainfo/ChulmaDetailInfoList.do?Act=02&Sub=1&meet={meet_id}"
    save_dir = "/Users/jin/race_database/data/0_raw/"
    
    if not os.path.exists(save_dir):
        os.makedirs(save_dir)
        print(f"Created directory: {save_dir}")

    driver = get_driver()
    print(f"Navigating to: {target_url}")
    
    try:
        driver.get(target_url)
        wait = WebDriverWait(driver, 10)
        
        # Wait for the table to appear
        wait.until(EC.presence_of_element_located((By.CLASS_NAME, "tableType1")))
        
        # Find PDF links
        tables = driver.find_elements(By.CLASS_NAME, "tableType1")
        pdf_links = []
        
        for table in tables:
            links = table.find_elements(By.TAG_NAME, "a")
            for link in links:
                href = link.get_attribute("href")
                if href and href.lower().endswith('.pdf'):
                    text = link.text.strip()
                    pdf_links.append((href, text))
        
        if not pdf_links:
            print("No PDF links found.")
            return

        print(f"Found {len(pdf_links)} PDF files. Starting download...")
        
        # Use a requests session with Selenium cookies for downloading
        session = requests.Session()
        for cookie in driver.get_cookies():
            session.cookies.set(cookie['name'], cookie['value'])
        
        headers = {
            'User-Agent': driver.execute_script("return navigator.userAgent")
        }

        for url, title in pdf_links:
            filename = os.path.basename(url)
            save_path = os.path.join(save_dir, filename)
            
            print(f"Downloading: {filename} ({title})...")
            try:
                pdf_response = session.get(url, headers=headers, stream=True)
                pdf_response.raise_for_status()
                
                with open(save_path, 'wb') as f:
                    for chunk in pdf_response.iter_content(chunk_size=8192):
                        f.write(chunk)
                print(f"Successfully saved to: {save_path}")
            except Exception as e:
                print(f"Failed to download {url}: {e}")

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        driver.quit()

def run_all_regions():
    """
    Downloads PDFs for both Seoul (meet_id=1) and Busan (meet_id=3).
    """
    regions = [
        {"id": 1, "name": "서울"},
        {"id": 3, "name": "부산"}
    ]
    
    for region in regions:
        print(f"\n=== [{region['name']} 지역 PDF 다운로드 시작] ===")
        download_kra_pdfs(meet_id=region['id'])

if __name__ == "__main__":
    run_all_regions()
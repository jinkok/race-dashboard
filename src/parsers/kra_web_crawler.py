# =================================================================================
# [프로그램 설명]
# 이 프로그램은 '한국마사회(KRA)' 홈페이지에 접속해서 경마 정보를 자동으로 수집해주는 로봇(크롤러)입니다.
# 사람이 일일이 클릭해서 복사/붙여넣기 하는 작업을 코드로 대신 수행합니다.
# 
# [주요 기능 요약]
# 1. 크롬 브라우저를 자동으로 엽니다.
# 2. 지정한 경마장(서울/제주/부산)과 경주 번호 페이지로 이동합니다.
# 3. '출전표', '전적', '조교현황' 등 탭을 하나씩 누르면서 표에 있는 글자들을 읽어옵니다.
# 4. 말 이름을 클릭해서 뜨는 팝업창(상세정보)도 확인하고 닫습니다.
# 5. 수집한 정보들을 엑셀 파일(CSV)로 저장하고, 마지막에 보기 좋게 합쳐줍니다.
# 6. '체중현황' 포함 JSON 파일 생성 (entries에 금일체중, 증감 정보 추가됨)
# 
# [업데이트 내역]
# - 출전표 팝업에서 '부마'와 함께 '등급' 정보도 추출하도록 기능 추가
# =================================================================================

# --- 1. 필요한 도구상자(라이브러리) 가져오기 ---
import csv       # 엑셀처럼 표 데이터를 저장하고 읽을 때 사용하는 도구
import time      # 컴퓨터에게 "잠깐 기다려!"라고 명령할 때 쓰는 도구 (로딩 대기용)
import os        # 폴더를 만들거나 파일 경로를 다룰 때 쓰는 도구
import re        # 글자 중에서 날짜나 숫자 같은 특정 패턴을 찾을 때 쓰는 도구 (정규표현식)
import glob      # 폴더 안에 파일이 뭐뭐 있는지 목록을 뽑아올 때 쓰는 도구
import pandas as pd # 데이터를 표(테이블) 형태로 아주 쉽게 다루게 해주는 강력한 도구
import json      # 데이터를 자바스크립트 객체 표기법(JSON)으로 다루는 도구
from tqdm import tqdm # 작업 진행 상황을 막대바(Progress Bar)로 보여주는 도구
from io import StringIO # 문자열을 파일처럼 다루기 위해 추가

# --- Selenium: 웹 브라우저를 자동으로 조종하는 핵심 도구들 ---
from selenium import webdriver  # 웹 브라우저 자체를 의미
from selenium.webdriver.chrome.service import Service as ChromeService # 크롬 드라이버 서비스
from selenium.webdriver.chrome.options import Options # 브라우저 옵션(창 크기 등) 설정
from selenium.webdriver.common.by import By # 화면에서 요소를 찾을 때 쓰는 기준 (ID로 찾기, 링크 텍스트로 찾기 등)
# 아래는 자주 발생하는 에러들을 미리 등록해두는 것입니다. (예: 요소가 없다, 시간 초과다 등)
from selenium.common.exceptions import NoSuchElementException, TimeoutException, StaleElementReferenceException
# 아래는 "화면에 버튼이 나올 때까지 기다려" 같은 기능을 쓰기 위한 도구들입니다.
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC 

# ==========================================
# [전역 변수] - 프로그램 어디서든 접근할 수 있는 공용 바구니
# ==========================================
# 여러 경주마들의 상세 훈련 정보를 잠시 담아두는 리스트입니다.
# 팝업창에서 수집한 정보를 여기에 모았다가 나중에 한 번에 파일로 저장합니다.
all_training_details_to_merge = []

# ==========================================
# 1. 폴더 생성 함수
# 목표: 경주 제목을 보고 알아서 폴더를 예쁘게 만들어주기
# 예: "2023년 10월 5일 서울 1경주" -> "서울1005/서울1경주" 폴더 생성
# ==========================================
def create_folder_structure(race_title):
    try:
        # 정규표현식(re)을 사용해 '서울', '부산' 같은 단어를 찾습니다.
        location_match = re.search(r'(서울|부산|부경|제주|광주|대구|대전|청주|원주|전주|창원)', race_title)
        # 찾으면 그 단어를 쓰고, 못 찾으면 '기타'라고 합니다.
        location = location_match.group(1) if location_match else "기타"
        if location == "부경": location = "부산" # '부경'은 '부산'으로 통일해서 저장합니다.
        
        # '몇월 며칠' 패턴을 찾습니다. (\d는 숫자를 의미)
        date_match = re.search(r'(\d{1,2})월\s*(\d{1,2})일', race_title)
        if date_match:
            # 월, 일을 가져와서 두 자리로 맞춥니다 (예: 1월 -> 01) - zfill(2) 함수 사용
            month = date_match.group(1).zfill(2)
            day = date_match.group(2).zfill(2)
            date_str = f"{month}{day}" # 예: "1005"
        else:
            date_str = "날짜미상"
        
        # '몇경주' 인지 숫자를 찾습니다.
        race_match = re.search(r'(\d+)경주', race_title)
        race_num = race_match.group(1) if race_match else "경주번호미상"
        
        # 위에서 찾은 정보로 폴더 경로를 만듭니다. (예: 부산1005/부산1경주)
        folder_path = f"{location}{date_str}/{location}{race_num}경주"
        
        # os.makedirs: 실제 폴더를 만듭니다.
        # exist_ok=True: 이미 폴더가 있어도 에러 내지 말고 넘어가라는 뜻입니다.
        os.makedirs(folder_path, exist_ok=True)
        return folder_path

    except Exception as e:
        # 혹시라도 에러가 나면 내용을 출력하고 기본 폴더를 씁니다.
        print(f"⚠️ 폴더 생성 중 문제가 생겼습니다: {e}")
        return "race_data"

# ==========================================
# 2. 크롬 브라우저 실행 함수
# 목표: 설정을 맞춰서 크롬 창을 띄우고 사이트에 접속하기
# ==========================================
def get_driver_and_load_page(url):
    # 크롬 옵션 설정 바구니를 만듭니다.
    options = Options()
    options.add_argument('window-size=1920x1080') # 화면 크기를 크게 설정 (작으면 버튼이 안 보일 수 있음)
    options.add_argument('--no-sandbox')          # 리눅스 환경 등에서 보안 에러 방지용
    options.add_argument('--disable-dev-shm-usage') # 메모리 부족 에러 방지용
    # options.add_argument('--headless') # 이 줄의 주석(#)을 지우면 브라우저 창이 안 뜨고 몰래 실행됩니다.

    try:
        service = ChromeService() 
        # 설정한 옵션대로 크롬 브라우저(driver)를 실행합니다.
        driver = webdriver.Chrome(service=service, options=options)
        
        print(f"🌐 인터넷 창을 열고 접속합니다: {url}")
        driver.get(url) # 지정한 주소(URL)로 이동!
        return driver   # 나중에 써야 하니까 조종권(driver)을 반환해줍니다.
        
    except Exception as e:
        print(f"❌ 브라우저를 여는 데 실패했습니다: {e}")
        # 만약 실패했는데 브라우저가 열려있다면 닫아줍니다.
        if 'driver' in locals() and driver: driver.quit()
        return None

# ==========================================
# [중요] 안전하게 페이지 이동하는 함수
# 목표: 다음 경주로 넘어갈 때 마사회 메인 페이지로 튕기지 않았는지 확인하고,
#       확실하게 목록 페이지가 뜰 때까지 재시도하는 함수입니다.
# ==========================================
def safe_move_to_list_page(driver, wait, url, race_num, idx):
    max_retries = 3 # 최대 3번까지 재시도하겠다는 설정
    
    for attempt in range(max_retries):
        try:
            # 1. URL 접속 (또는 재접속)
            # 현재 주소에 "ChulmaDetailInfoList"(상세정보목록) 글자가 없거나(튕김), 재시도 중이면
            if "ChulmaDetailInfoList" not in driver.current_url or attempt > 0:
                driver.get(url) # 목록 페이지로 다시 이동 명령
            
            # 2. 로딩 확인 (핵심!)
            # 우리가 클릭해야 할 경주 번호(race_num) 버튼이 화면에 나올 때까지 기다립니다.
            # [중요 수정]
            # - 기존: 페이지 전체에서 `//a[text()='{race_num}']` 중 idx번째를 사용
            # - 문제: 같은 숫자를 가진 링크(예: 다른 메뉴, 다른 표)가 많을 경우
            #         1~4경주는 우연히 맞다가 5번째부터 엉뚱한 링크를 잡아서
            #         상세 페이지(tableType1)로 안 들어가고 타임아웃이 발생
            # - 수정: "일자별 경주정보" 메인 표의 3번째 컬럼(경주 번호) 안에 있는 링크만 대상으로 한정
            target_xpath = (
                f"(//*[@id='contents']//div[contains(@class,'tableType2')]"
                f"//table//tr/td[3]/a[normalize-space(text())='{race_num}'])[{idx}]"
            )
            
            # wait.until: 조건이 만족될 때까지 기다립니다. (안 나오면 에러 발생 -> except로 이동)
            wait.until(EC.element_to_be_clickable((By.XPATH, target_xpath)))
            
            # 여기까지 에러 없이 왔다면 성공!
            return True
            
        except Exception:
            # 기다려도 안 나오거나 에러가 나면 여기로 옵니다.
            print(f"⚠️ 목록 페이지 로딩 불안정 (재시도 {attempt+1}/{max_retries}): 메인 페이지로 이동되었거나 로딩 실패.")
            time.sleep(2) # 2초 쉬고 다시 시도
            
    return False # 3번 다 실패하면 False(실패) 반환

# ==========================================
# 3. 부마 및 등급 정보 찾기 함수 (수정됨)
# 목표: 팝업창에서 '부마' 이름과 '등급'을 찾아서 반환 (부마, 등급) 튜플 형태
# ==========================================
def get_horse_details_from_popup(driver, wait):
    sire_text = "-"
    grade_text = "-"

    # 1. 부마 이름 찾기
    try:
        # 방법 1: 부마 이름이 클릭 가능한 링크(a 태그)인 경우
        try:
            xpath_a = "//*[@id='contents']//th[contains(text(), '부마')]/following-sibling::td[1]//a"
            sire_a = wait.until(EC.presence_of_element_located((By.XPATH, xpath_a)))
            text = sire_a.text.strip()
            if text: sire_text = text
        except: pass

        # 방법 2: 부마 이름이 그냥 글자(td 태그)인 경우 (방법 1 실패시 시도)
        if sire_text == "-":
            try:
                xpath_td = "//*[@id='contents']//th[contains(text(), '부마')]/following-sibling::td[1]"
                sire_td = wait.until(EC.presence_of_element_located((By.XPATH, xpath_td)))
                text = sire_td.text.strip()
                if text: sire_text = text
            except: pass
    except:
        pass

    # 2. 등급 정보 찾기 (추가됨)
    try:
        # 사용자가 지정한 위치: //*[@id="contents"]/div[1]/table/tbody/tr[2]/td[1]
        xpath_grade = '//*[@id="contents"]/div[1]/table/tbody/tr[2]/td[1]'
        grade_elem = wait.until(EC.presence_of_element_located((By.XPATH, xpath_grade)))
        raw_grade = grade_elem.text.strip() # 예: "국3(2024/12/02)"
        
        # 등급만 추출하기 (괄호 앞부분만 가져옴)
        if raw_grade:
            grade_text = raw_grade.split('(')[0].strip()
    except:
        pass

    return sire_text, grade_text

# ==========================================
# 4. 훈련 상세 정보 추출 함수
# 목표: 말 프로필 팝업 -> '조교사항' 탭 클릭 -> 표 내용 긁어오기
# ==========================================
def extract_training_details(driver, wait):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            training_data = []
            
            # 1. '조교사항' 탭 버튼 찾아서 클릭
            # (마사회 팝업창 구조상 10번째 li 태그가 조교사항인 경우가 많음)
            training_tab_xpath = "//*[@id='contents']/ul/li[10]/a" 
            training_tab = wait.until(EC.element_to_be_clickable((By.XPATH, training_tab_xpath)))
            training_tab.click()
            
            time.sleep(0.5) # 탭이 바뀌는 찰나의 순간을 기다림
            
            # 2. 표(table) 찾기 (class 이름이 tableType2인 곳)
            table_container = wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'tableType2')))
            table_element = table_container.find_element(By.TAG_NAME, 'table')
            
            # 3. 제목줄(thead) 읽기 (예: 조교일자, 조교시간, 기승자 등)
            thead = table_element.find_element(By.TAG_NAME, 'thead')
            headers = [' '.join(th.text.split()) for th in thead.find_elements(By.TAG_NAME, 'th') if th.text.strip()]
            
            # 4. 내용줄(tbody) 읽기
            tbody = table_element.find_element(By.TAG_NAME, 'tbody')
            row_elements = tbody.find_elements(By.TAG_NAME, 'tr')
            
            # 5. 한 줄씩 데이터 뽑아서 리스트에 저장
            for row in row_elements:
                tds = row.find_elements(By.TAG_NAME, 'td')
                cells = [td.text.replace('\n', ' ').strip() for td in tds]
                
                # 데이터가 있고, "자료가 없습니다" 메시지가 아니면 저장
                if cells and cells[0] != "자료가 없습니다.":
                    if len(headers) == len(cells):
                        # zip 함수: 헤더랑 데이터를 지퍼처럼 짝지어줍니다. (예: {조교일자: 10/05, 기승자: 홍길동})
                        training_data.append(dict(zip(headers, cells)))
            
            return training_data 
            
        except StaleElementReferenceException:
            # "요소가 낡았습니다" 에러: 페이지가 새로고침되어서 찾았던 버튼이 사라짐. 다시 시도.
            if attempt < max_retries - 1:
                time.sleep(1)
                continue
            else:
                return []
        except TimeoutException:
            return [] 
        except Exception:
            return []
    return []

# ==========================================
# 5. 메인 표 데이터 수집 함수 (가장 중요한 부분!)
# 목표: 출전표 탭의 데이터를 읽고, 각 말마다 팝업창을 열어서 추가 정보를 가져오는 복합 작업
# ==========================================
def extract_and_save_table_with_sire(driver, wait, filename_prefix, suffix, summary_rows, folder_path):
    global all_training_details_to_merge # 전역 변수를 쓰겠다고 선언
    
    # 나중에 길을 잃으면 돌아오기 위해 현재 주소를 저장해둡니다.
    original_list_url = driver.current_url 
    filename = os.path.join(folder_path, f"{filename_prefix}{suffix}.csv") 
    
    print(f"\n--- {suffix[1:]} 데이터를 수집합니다 ---")
    
    headers = []
    data_rows = []
    
    # 1. 표의 헤더(제목) 읽기
    try:
        table_container = wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'tableType2')))
        table_element = table_container.find_element(By.TAG_NAME, 'table')
        thead = table_element.find_element(By.TAG_NAME, 'thead')
        headers = [' '.join(th.text.split()) for th in thead.find_elements(By.TAG_NAME, 'th') if th.text.strip()]
    except Exception as e:
        print(f"⚠️ 표 헤더 읽기 실패: {e}")
        return

    # 2. '마명'과 '마번'이 몇 번째 칸에 있는지 미리 찾아둡니다.
    horse_num_idx = -1
    horse_name_idx = -1
    if suffix == "_출전표":
        for i, h in enumerate(headers):
            if "마명" in h.replace(" ", ""): horse_name_idx = i
            if "마번" in h.replace(" ", "") or "번호" in h.replace(" ", ""): horse_num_idx = i
        # '부마'와 '등급' 컬럼을 우리가 강제로 추가합니다.
        if horse_name_idx != -1: 
            headers.append("부마")
            headers.append("등급")
    
    # 3. 표 내용 반복 읽기 시작
    try:
        table_container = wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'tableType2')))
        table = table_container.find_element(By.TAG_NAME, 'table')
        all_trs = table.find_elements(By.TAG_NAME, 'tr')
        
        # 헤더 줄 개수만큼 건너뛰기 계산
        skip_rows = 0
        theads = table.find_elements(By.TAG_NAME, 'thead')
        if theads: skip_rows = len(theads[0].find_elements(By.TAG_NAME, 'tr'))
        
        # tqdm: 화면에 진행률 막대를 보여주기 위한 설정
        total_items = len(all_trs) - skip_rows
        pbar = tqdm(total=total_items, desc="경주마 분석 중", unit="마리")

        # 실제 데이터 행 반복문 (i는 행 번호)
        for i in range(skip_rows, len(all_trs)):
            try:
                # [안전장치] 혹시 다른 페이지로 갔으면 원래 페이지로 복귀
                current_u = driver.current_url.lower()
                if "chulmapyo" not in current_u and "list" not in current_u:
                     driver.get(original_list_url)
                     wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'tableType2')))

                # 요소를 다시 찾습니다 (페이지가 새로고침되면 옛날 요소는 못 씀 - Stale 에러 방지)
                current_container = wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'tableType2')))
                current_table = current_container.find_element(By.TAG_NAME, 'table')
                current_rows = current_table.find_elements(By.TAG_NAME, 'tr')
                
                if i >= len(current_rows): break
                row = current_rows[i]
                tds = row.find_elements(By.TAG_NAME, 'td')
                cells = [td.text.replace('\n', ' ').strip() for td in tds]
                
                sire_name = "-"
                horse_grade = "-"
                
                # 출전표 탭이면 말 이름을 클릭해서 상세 정보를 가져옵니다.
                if suffix == "_출전표" and horse_name_idx != -1 and len(tds) > horse_name_idx:
                    horse_num = cells[horse_num_idx] if horse_num_idx != -1 else "-"
                    horse_name = cells[horse_name_idx]
                    
                    try:
                        # 말 이름에 걸린 링크 찾기
                        horse_td = row.find_elements(By.TAG_NAME, 'td')[horse_name_idx]
                        links = horse_td.find_elements(By.TAG_NAME, 'a')
                        target_link = links[0] if links else None
                        
                        if target_link:
                            main_window = driver.current_window_handle # 현재 창(메인) 기억해두기
                            driver.execute_script("arguments[0].click();", target_link) # 자바스크립트로 강제 클릭
                            
                            # 새 창(팝업)이 뜨거나 페이지가 바뀔 때까지 대기
                            try:
                                WebDriverWait(driver, 3).until(lambda d: len(d.window_handles) > 1 or "profileHorseItem" in d.current_url)
                            except: pass
                            
                            # 팝업창인지 아닌지 확인해서 제어권을 이동
                            is_popup = False
                            if len(driver.window_handles) > 1:
                                is_popup = True
                                driver.switch_to.window(driver.window_handles[-1]) # 새 창으로 포커스 이동
                                
                            # 상세 정보 수집 함수 호출 (부마 + 등급)
                            sire_name, horse_grade = get_horse_details_from_popup(driver, wait)
                            training_info = extract_training_details(driver, wait)
                            
                            # 수집한 정보에 마번, 마명을 붙여서 전역 리스트에 담기
                            for detail in training_info:
                                detail['마번'] = horse_num
                                detail['마명'] = horse_name
                                all_training_details_to_merge.append(detail)
                            
                            # 팝업이면 닫고 원래 창으로 복귀
                            if is_popup:
                                driver.close()
                                driver.switch_to.window(main_window)
                            else:
                                # 팝업이 아니라 페이지 이동이었다면 뒤로가기
                                max_retries = 5
                                retry_cnt = 0
                                while "chulmapyo" not in driver.current_url.lower() and retry_cnt < max_retries:
                                    driver.back()
                                    try:
                                        wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'tableType2')))
                                    except:
                                        time.sleep(0.5)
                                    retry_cnt += 1
                                
                                # 뒤로가기 실패하면 강제 이동
                                if "chulmapyo" not in driver.current_url.lower():
                                    driver.get(original_list_url)
                                    wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'tableType2')))
                            
                    except Exception:
                        # 클릭하다 에러나면 일단 복구 시도
                        try:
                            driver.get(original_list_url)
                            wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'tableType2')))
                        except: pass
                    
                    # 찾은 부마 이름과 등급을 데이터 리스트 끝에 추가
                    cells.append(sire_name)
                    cells.append(horse_grade)

                if cells:
                    data_rows.append(cells)
                
                pbar.update(1) # 진행률 1 증가

            except Exception:
                continue # 이 줄에서 에러나면 다음 말로 넘어감
        
        pbar.close()

    except Exception as e:
        print(f"❌ 데이터 추출 루프 오류: {e}")

    # CSV 파일로 저장
    if data_rows or summary_rows:
        try:
            # utf-8-sig: 엑셀에서 한글 안 깨지게 하는 인코딩
            with open(filename, 'w', encoding='utf-8-sig', newline='') as f:
                writer = csv.writer(f)
                if suffix == "_출전표" and summary_rows:
                    writer.writerows(summary_rows) 
                    writer.writerow([]) # 빈 줄 추가
                if headers: writer.writerow(headers) 
                writer.writerows(data_rows) 
            print(f"✅ 저장 완료: {filename}")
        except Exception as e:
            print(f"❌ 파일 쓰기 오류: {e}")

# ==========================================
# 6. 최근 10회 전적 추출 함수
# 목표: 구조가 다른 '최근 10회 전적' 탭 데이터를 따로 처리
# ==========================================
def extract_10race_history(driver, wait, filename_prefix, folder_path):
    print(f"\n--- 최근 10회 전적 추출 ---")
    try:
        # 전적 테이블 로딩 대기
        wait.until(EC.presence_of_element_located((By.CLASS_NAME, "tableType1")))
        
        # 상단 안내 문구 읽기
        table_head = driver.find_element(By.CLASS_NAME, "tableType1")
        race_notice = [tr.text for tr in table_head.find_elements(By.TAG_NAME, "tr")]
        
        # 실제 데이터 테이블들 찾기 (여러 개일 수 있음)
        tables = wait.until(EC.presence_of_all_elements_located((By.CLASS_NAME, "tableType2")))
        all_data = []
        
        # 중간중간 반복되는 헤더를 걸러내기 위한 패턴
        header_pattern = ['순', '경주일자', '마번', '종류', '등급', '거리', '함수율', '빠르기', '순위', '기수명', '중량', 'S-1F', 'G-3F', 'G-1F', '기록', '마체중', '레이팅', '동영상']
        
        for table in tables:
            rows = table.find_elements(By.TAG_NAME, "tr")
            for row in rows:
                cols = row.find_elements(By.TAG_NAME, "th") + row.find_elements(By.TAG_NAME, "td")
                data = [c.text.strip() if c.text.strip() else "-" for c in cols]
                if not data:
                    continue
                # 헤더 줄이랑 똑같으면(데이터가 아니면) 건너뛰기
                if len(data) >= len(header_pattern) and data[:len(header_pattern)] == header_pattern:
                    continue
                all_data.append(data)
        
        if not all_data: return
        
        # 컬럼 이름 맞추기 (데이터가 헤더보다 길면 '컬럼1', '컬럼2' 추가)
        columns = header_pattern.copy()
        max_cols = max(len(row) for row in all_data)
        if max_cols > len(columns):
            columns.extend([f'컬럼{i+1}' for i in range(len(columns), max_cols)])
            
        csv_filename = os.path.join(folder_path, f"{filename_prefix}_최근10회전적.csv")
        with open(csv_filename, 'w', encoding='utf-8-sig', newline='') as f:
            for line in race_notice: f.write(f"# {line}\n") 
            writer = csv.writer(f)
            writer.writerow(columns[:max_cols])
            writer.writerows(all_data)
        print(f"✅ 전적 저장 완료")
    except Exception as e:
        print(f"❌ 전적 추출 오류: {e}")

# ==========================================
# 7. 파일 내용 붙여넣기 헬퍼 함수
# 목표: A 파일을 읽어서 B 파일에 내용 그대로 복사해주는 단순 도우미
# ==========================================
def write_file_content(outfile, filepath, title):
    outfile.write(f"\n{'='*40}\n[[ {title} ]]\n{'='*40}\n") 
    try:
        with open(filepath, 'r', encoding='utf-8-sig') as infile: outfile.write(infile.read())
    except:
        try:
            # 인코딩 에러 나면 cp949(윈도우 옛날 한글)로 시도
            with open(filepath, 'r', encoding='cp949') as infile: outfile.write(infile.read())
        except: outfile.write("파일 읽기 실패")
    outfile.write("\n\n")

# ==========================================
# 8. 스마트 통합 및 파일 생성 함수 (핵심!)
# 목표: 수집한 CSV 파일들을 모아서 하나의 TXT 리포트와 JSON 데이터로 변환
# ==========================================
def merge_csv_files_for_race(folder_path, filename_prefix):
    print(f"\n--- 최종 통합 파일 생성 시작: {filename_prefix} ---")
    
    # 해당 폴더 안의 모든 CSV 파일 찾기
    pattern = os.path.join(folder_path, f"{filename_prefix}_*.csv")
    csv_files = [f for f in glob.glob(pattern) if "체중현황" not in f and "조교상세_통합" not in f]
    
    output_file = os.path.join(folder_path, f"{filename_prefix}_통합데이터_최종.txt")
    json_output_file = os.path.join(folder_path, f"{filename_prefix}_total.json")
    
    # 텍스트 파일에 붙여넣을 순서 지정
    priority = ["출전표", "최근10회전적", "조교현황", "말기수상관전적", "진료현황", "심판리포트", "체중현황"] 
    
    try:
        # [작업 1] TXT 통합 리포트 만들기
        with open(output_file, 'w', encoding='utf-8') as outfile:
            # 지정한 순서대로 파일 내용을 합칩니다.
            for key in priority:
                target = next((f for f in glob.glob(pattern) if key in os.path.basename(f)), None)
                if target:
                    write_file_content(outfile, target, key)

                # '조교현황' 다음에는 우리가 열심히 수집한 '조교 상세 데이터'를 붙입니다.
                if key == "조교현황":
                    detailed_training_path = os.path.join(folder_path, f"{filename_prefix}_조교상세_통합.csv")
                    
                    if os.path.exists(detailed_training_path):
                        outfile.write("\n\n" + "="*50 + "\n[[ 조교 상세 데이터 (전체) ]]\n" + "="*50 + "\n")
                        try:
                            # pandas로 csv를 읽어서 정렬하고 예쁘게 출력
                            df_detail = pd.read_csv(detailed_training_path)
                            if '마번' in df_detail.columns:
                                try:
                                    # 마번은 숫자로 바꿔서 정렬 (1, 2, 10 순서)
                                    df_detail['마번_sort'] = pd.to_numeric(df_detail['마번'], errors='coerce')
                                    df_detail = df_detail.sort_values(by=['마번_sort', '조교일자'], ascending=[True, False])
                                except:
                                    df_detail = df_detail.sort_values(by=['마번', '조교일자'], ascending=[True, False])

                            # 말 별로 데이터를 묶어서 출력
                            horses = df_detail['마명'].unique()
                            for horse in horses:
                                horse_data = df_detail[df_detail['마명'] == horse]
                                if horse_data.empty: continue
                                horse_no = str(horse_data.iloc[0]['마번']) if '마번' in horse_data.columns else "?"
                                outfile.write(f"\n[ {horse_no}번 {horse} ]\n")
                                # DataFrame을 문자열로 변환 (to_string)
                                outfile.write(horse_data.drop(columns=['마번', '마번_sort', '마명'], errors='ignore').to_string(index=False))
                                outfile.write("\n" + "-" * 65 + "\n")
                                
                        except Exception as e:
                            outfile.write(f"\n[오류] 조교 상세 데이터 처리 중 문제 발생: {e}\n")
            
            # 순서 목록에 없는 나머지 파일들도 뒤에 붙여줍니다.
            for f in glob.glob(pattern):
                if not any(k in os.path.basename(f) for k in priority):
                    write_file_content(outfile, f, os.path.basename(f).replace('.csv',''))

        print(f"✅ 통합 파일 생성 완료: {output_file}")
        
        # [작업 2] JSON 데이터 파일 만들기 (프로그램용 데이터)
        # 딕셔너리 구조(키:값)로 데이터를 정리해서 json 파일로 저장하는 과정입니다.
        json_root = {}
        
        # (2-1) 출전표 데이터 파싱
        chul_file = next((f for f in csv_files if "출전표" in os.path.basename(f)), None)
        entries = []
        race_header = {}
        if chul_file:
            try:
                with open(chul_file, "r", encoding="utf-8-sig") as f:
                    lines = f.read().splitlines()
                if len(lines) >= 4:
                    header_line1 = lines[0].strip()
                    header_line2 = lines[1].strip()
                    header_csv = "\n".join(lines[3:])
                    
                    # 정규표현식으로 날짜, 장소, 경주번호 추출
                    date_match = re.search(r'\d{4}년\s*\d{1,2}월\s*\d{1,2}일\(.\)', header_line1)
                    date_str = date_match.group(0) if date_match else ""
                    race_no_match = re.search(r'제(\d+)경주', header_line1)
                    race_number = int(race_no_match.group(1)) if race_no_match else None
                    loc_match = re.search(r'(서울|부산|부경|제주)', header_line1)
                    location = loc_match.group(1) if loc_match else ""
                    if location == "부경": location = "부산경남"
                    start_time = header_line1.split(",")[-1].strip() if "," in header_line1 else ""
                    
                    # 등급 조건 추출
                    class_info = ""
                    conditions = []
                    if header_line2:
                        m_idx = header_line2.find("M")
                        if m_idx != -1:
                            class_info = header_line2[:m_idx + 1].strip()
                            rest = header_line2[m_idx + 1:].replace("  ", " ")
                        else:
                            rest = header_line2
                        for token in re.split(r'[,\s]+', rest):
                            if token.strip(): conditions.append(token.strip())
                    
                    race_header = {
                        "date": date_str, "location": location, "race_number": race_number,
                        "start_time": start_time, "class_info": class_info, "conditions": conditions,
                    }
                    
                    # CSV 텍스트를 판다스로 읽기
                    from io import StringIO
                    df_chul = pd.read_csv(StringIO(header_csv))
                    
                    # 컬럼 이름이 조금씩 달라도 유연하게 찾기 위한 함수
                    def get_col_like(df, target):
                        for c in df.columns:
                            if target in c: return c
                        return None
                    
                    # 컬럼 매핑
                    col_num = get_col_like(df_chul, "번호")
                    col_name = get_col_like(df_chul, "마명")
                    col_origin = get_col_like(df_chul, "산지")
                    col_gender = get_col_like(df_chul, "성별")
                    col_age = get_col_like(df_chul, "연령")
                    col_rating = get_col_like(df_chul, "레이팅")
                    col_weight = get_col_like(df_chul, "중량")
                    col_jockey = get_col_like(df_chul, "기수명")
                    col_trainer = get_col_like(df_chul, "조교사명")
                    col_train_cnt = get_col_like(df_chul, "조교 횟수")
                    col_cycle = get_col_like(df_chul, "출전 주기")
                    col_equip = get_col_like(df_chul, "장구현황")
                    col_sire = get_col_like(df_chul, "부마")
                    col_grade = get_col_like(df_chul, "등급") # 등급 추가
                    
                    # 데이터 정제 및 리스트 저장
                    for _, row in df_chul.iterrows():
                        try: entry_number = int(str(row[col_num]).replace("▲", "")) if col_num else None
                        except: entry_number = None
                        
                        rating_val = None
                        if col_rating:
                            m = re.search(r'(\d+)', str(row[col_rating]))
                            rating_val = int(m.group(1)) if m else None
                        
                        weight_val = None
                        if col_weight:
                            try:
                                w_raw = str(row[col_weight]).replace(" ", "").replace("*", "")
                                wm = re.search(r'(\d+(\.\d+)?)', w_raw)
                                weight_val = float(wm.group(1)) if wm else None
                            except: weight_val = None
                        
                        entries.append({
                            "entry_number": entry_number,
                            "horse_name": str(row[col_name]) if col_name else "",
                            "origin": str(row[col_origin]) if col_origin else "",
                            "gender": str(row[col_gender]) if col_gender else "",
                            "age": int(row[col_age]) if col_age is not None else None,
                            "rating": rating_val, "weight": weight_val,
                            "jockey": str(row[col_jockey]) if col_jockey else "",
                            "trainer": str(row[col_trainer]) if col_trainer else "",
                            "training_total": int(row[col_train_cnt]) if col_train_cnt is not None else None,
                            "race_cycle": str(row[col_cycle]) if col_cycle else "",
                            "equipment": str(row[col_equip]) if col_equip else "",
                            "sire": str(row[col_sire]) if col_sire else "",
                            "grade": str(row[col_grade]) if col_grade else "", # 등급 데이터 추가
                        })
            except Exception as e: print(f"⚠️ total.json 생성 중 출전표 처리 오류: {e}")

        # (2-2) 체중현황 데이터 병합 (entries에 추가) [추가된 부분]
        weight_file = next((f for f in glob.glob(pattern) if "체중현황" in os.path.basename(f)), None)
        if weight_file:
            try:
                df_weight = pd.read_csv(weight_file, encoding="utf-8-sig")
                
                # 컬럼 찾기 (마명, 금일체중, 증감)
                w_col_name = None
                w_col_today = None
                w_col_change = None
                
                for c in df_weight.columns:
                    if "마명" in c: w_col_name = c
                    elif "금일체중" in c: w_col_today = c
                    elif "증감" in c: w_col_change = c
                
                # 매핑 딕셔너리 생성 (마명 -> 체중정보)
                weight_map = {}
                if w_col_name and w_col_today:
                    for _, row in df_weight.iterrows():
                        h_name = str(row[w_col_name]).strip()
                        t_weight = str(row[w_col_today]).strip()
                        # 증감 컬럼이 있으면 가져오고 없으면 빈 문자열
                        w_change = str(row[w_col_change]).strip() if w_col_change else ""
                        
                        weight_map[h_name] = {
                            "h_weight": t_weight,
                            "h_weight_change": w_change
                        }
                
                # entries 리스트 업데이트
                for entry in entries:
                    h_name = entry.get("horse_name")
                    if h_name and h_name in weight_map:
                        entry["h_weight"] = weight_map[h_name]["h_weight"]
                        entry["h_weight_change"] = weight_map[h_name]["h_weight_change"]
                    else:
                        entry["h_weight"] = None
                        entry["h_weight_change"] = None
                
                print(f"✅ 체중 정보 병합 완료")
                        
            except Exception as e:
                print(f"⚠️ total.json 생성 중 체중현황 병합 오류: {e}")

        json_root["race_header"] = race_header
        json_root["entries"] = entries

        # 말 이름과 조교 횟수를 매핑 (나중에 조교 데이터 자를 때 씀)
        horse_training_count_map = {}
        for e in entries:
            name = e.get("horse_name")
            cnt = e.get("training_total")
            if name: horse_training_count_map[name] = cnt

        # (2-3) 조교 상세 데이터 처리
        training_logs = []
        detailed_training_path = os.path.join(folder_path, f"{filename_prefix}_조교상세_통합.csv")
        if os.path.exists(detailed_training_path):
            try:
                df_detail = pd.read_csv(detailed_training_path, encoding="utf-8-sig")
                # '-' 로 되어있는 무효 데이터 제거
                if "조교시간" in df_detail.columns:
                    df_work = df_detail[df_detail["조교시간"].astype(str) != "-"].copy()
                else: df_work = df_detail.copy()
                
                if "마명" in df_work.columns:
                    for horse, g in df_work.groupby("마명"):
                        # 날짜 최신순 정렬
                        if "조교일자" in g.columns: g = g.sort_values(by="조교일자", ascending=False)
                        sessions = []
                        for _, r in g.iterrows():
                            date_str = str(r.get("조교일자", ""))
                            rider = str(r.get("기승자", ""))
                            time_str = str(r.get("조교시간", ""))
                            gait = str(r.get("걸음걸이", ""))
                            swim = str(r.get("수영조교", ""))
                            ttype = gait
                            if swim and swim != "-": ttype = f"{gait} / 수영:{swim}" if gait else f"수영:{swim}"
                            sessions.append({"date": date_str, "rider": rider, "time": time_str, "type": ttype})
                        
                        # 출전표에 적힌 횟수만큼만 자르기
                        target_count = horse_training_count_map.get(horse)
                        if target_count is None: target_count = len(sessions)
                        sessions = sessions[:target_count]
                        training_logs.append({"horse": horse, "total_count": target_count, "sessions": sessions})
            except Exception as e: print(f"⚠️ total.json 생성 중 조교상세 처리 오류: {e}")
        json_root["training_logs_detailed"] = training_logs

        # (2-4) 최근 10회 전적 처리
        recent_file = next((f for f in csv_files if "최근10회전적" in os.path.basename(f)), None)
        recent_list = []
        if recent_file:
            try:
                with open(recent_file, "r", encoding="utf-8-sig") as f:
                    lines = [ln for ln in f.read().splitlines() if not ln.startswith("#")]
                if lines:
                    import collections
                    by_horse = collections.OrderedDict()
                    current_horse = None
                    horse_pattern = re.compile(r'\[말\].*?번\s+(\S+)')
                    for ln in lines[1:]:
                        ln = ln.strip()
                        if not ln: continue
                        # [말] 1번 가왕... 이런 줄 찾기
                        if ln.startswith("[말]"):
                            m = horse_pattern.search(ln)
                            if m: current_horse = m.group(1)
                            continue
                        if not current_horse or not ln[0].isdigit(): continue
                        parts = [p.strip() for p in ln.split(",")]
                        if len(parts) < 16: continue
                        try:
                            # 전적 데이터 파싱 (순위, 기록 등)
                            raw_date = parts[1]
                            date_only = raw_date.split("-")[0]
                            dist = int(parts[5])
                            moisture = int(parts[6]) if parts[6] != "-" else None
                            rank_str = parts[8].split("/")[0]
                            rank = int(rank_str) if rank_str.isdigit() else None
                            weight_field = parts[15]
                            wm = re.search(r'(\d+)', weight_field)
                            weight = int(wm.group(1)) if wm else None
                            rec = {
                                "date": date_only, "distance": dist, "moisture": moisture, "rank": rank,
                                "class": parts[3], "grade": parts[4],                                 
                                
                                "S1F": parts[11].replace("0:", "").replace(" ", ""),
                                "G3F": parts[12].replace("0:", "").replace(" ", ""),
                                "G1F": parts[13].replace("0:", "").replace(" ", ""),
                                "record": parts[14], 
                                
                                "weight": parts[10],
                                # "weight": weight,
                            }
                            by_horse.setdefault(current_horse, []).append(rec)
                        except: continue
                    for horse_name, recs in by_horse.items():
                        recent_list.append({"horse_name": horse_name, "records": recs[:10]})
            except Exception as e: print(f"⚠️ total.json 생성 중 최근10회전적 처리 오류: {e}")
        json_root["recent_records_detailed"] = recent_list

        # (2-5) 진료 현황 처리
        medical_file = next((f for f in csv_files if "진료현황" in os.path.basename(f)), None)
        medical_alerts = []
        if medical_file:
            try:
                df_med = pd.read_csv(medical_file, encoding="utf-8-sig")
                if "마명" in df_med.columns and "진료내역" in df_med.columns:
                    for _, r in df_med.iterrows():
                        horse = str(r["마명"])
                        raw = str(r["진료내역"])
                        if not horse or not raw or raw == "nan": continue
                        # 날짜와 내용 분리
                        chunks = [c for c in raw.split("  ") if c.strip()]
                        dates, details = [], []
                        for ch in chunks:
                            ch = ch.strip()
                            if len(ch) < 11: continue
                            dates.append(ch[:10]); details.append(ch[11:].strip())
                        medical_alerts.append({"horse": horse, "dates": dates, "details": details})
            except Exception as e: print(f"⚠️ total.json 생성 중 진료현황 처리 오류: {e}")
        json_root["medical_alerts"] = medical_alerts

        # (2-6) 기수 상관 전적 처리
        horse_jockey_file = next((f for f in csv_files if "말기수상관전적" in os.path.basename(f)), None)
        horse_jockey_stats = []
        if horse_jockey_file:
            try:
                df_hj = pd.read_csv(horse_jockey_file, encoding="utf-8-sig")
                for _, r in df_hj.iterrows():
                    horse_jockey_stats.append({
                        "entry_number": r.get("번호"), "horse_name": r.get("마명"), "jockey": r.get("기수명"),
                        "summary": r.get("출전(1/2/3)"), "last_race_date": r.get("최종출전"), "starts_1_2_3": r.get("출전(1/2/3)"),
                        "win_rate": r.get("승률"), "place_rate": r.get("복승률"), "show_rate": r.get("연승률"),
                    })
            except Exception as e: print(f"⚠️ total.json 생성 중 말기수상관전적 처리 오류: {e}")
        json_root["horse_jockey_stats"] = horse_jockey_stats

        # (2-7) 심판 리포트 처리
        steward_file = next((f for f in csv_files if "심판리포트" in os.path.basename(f)), None)
        steward_notes = []
        if steward_file:
            try:
                df_st = pd.read_csv(steward_file, encoding="utf-8-sig")
                col_horse, col_date, col_note = None, None, None
                for c in df_st.columns:
                    if "마명" in c: col_horse = c
                    elif "경주일자" in c: col_date = c
                    elif "심판리포트" in c: col_note = c
                current_horse = None
                for _, r in df_st.iterrows():
                    h = str(r[col_horse]) if col_horse and str(r[col_horse]) != "nan" else ""
                    if h: current_horse = h
                    if not current_horse or not col_date or not col_note: continue
                    d = str(r[col_date])
                    n = str(r[col_note])
                    if not d or d == "nan" or not n or n == "nan": continue
                    steward_notes.append({"horse": current_horse, "date": d.split("-")[0], "note": n.strip()})
            except Exception as e: print(f"⚠️ total.json 생성 중 심판리포트 처리 오류: {e}")
        json_root["steward_trip_notes"] = steward_notes

        try:
            with open(json_output_file, "w", encoding="utf-8") as jf:
                jf.write(json.dumps(json_root, ensure_ascii=False, indent=2))
            print(f"✅ JSON 파일 생성 완료: {json_output_file}")
        except Exception as e: print(f"❌ JSON 파일 저장 중 오류: {e}")

    except Exception as e:
        print(f"❌ 통합 파일 생성 중 오류: {e}")

# ==========================================
# 9. 기본 테이블 저장 함수
# 목표: 특수한 처리 없이 표 그대로 읽어서 저장하는 일반적인 함수
# ==========================================
def extract_and_save_table_basic(driver, wait, filename_prefix, suffix, summary_rows, folder_path):
    filename = os.path.join(folder_path, f"{filename_prefix}{suffix}.csv")
    print(f"\n--- {suffix[1:]} 데이터를 수집합니다 ---")
    
    headers = []
    data_rows = []
    
    try:
        table_container = wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'tableType2')))
        table_element = table_container.find_element(By.TAG_NAME, 'table')
        
        # 말기수상관전적 탭은 헤더가 복잡해서 강제로 지정해줍니다.
        if suffix == "_말기수상관전적":
             headers = ['번호', '마명', '기수명', '출전(1/2/3)', '승률', '복승률', '연승률', '최종출전']
        else:
            # 2단 헤더(위아래로 나뉜 제목) 처리 로직
            thead = table_element.find_element(By.TAG_NAME, 'thead')
            header_rows = thead.find_elements(By.TAG_NAME, 'tr')
            
            if suffix == "_조교현황" and len(header_rows) >= 2:
                top_ths = header_rows[0].find_elements(By.TAG_NAME, 'th')
                bottom_ths = header_rows[1].find_elements(By.TAG_NAME, 'th')
                bottom_texts = [' '.join(th.text.split()) for th in bottom_ths]
                
                b_idx = 0
                for th in top_ths:
                    txt = ' '.join(th.text.split())
                    colspan = th.get_attribute('colspan')
                    if colspan:
                        span = int(colspan)
                        for _ in range(span):
                            if b_idx < len(bottom_texts):
                                headers.append(f"{txt}_{bottom_texts[b_idx]}") # 예: 습보_횟수
                                b_idx += 1
                            else: headers.append(txt)
                    elif th.get_attribute('rowspan') == '2': headers.append(txt)
                    else: headers.append(txt)
            else:
                headers = [' '.join(th.text.split()) for th in thead.find_elements(By.TAG_NAME, 'th') if th.text.strip()]
            
    except Exception as e:
        print(f"⚠️ 표 헤더 읽기 실패: {e}")
        return
        
    try:
        table_container = wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'tableType2')))
        table = table_container.find_element(By.TAG_NAME, 'table')
        
        rows = table.find_elements(By.TAG_NAME, 'tr')
        skip = 0
        theads = table.find_elements(By.TAG_NAME, 'thead')
        if theads: skip = len(theads[0].find_elements(By.TAG_NAME, 'tr'))
        
        for i, row in enumerate(rows):
            if i < skip: continue 
            cells = [c.text.replace('\n', ' ').strip() for c in row.find_elements(By.XPATH, "./td | ./th")]
            if cells: data_rows.append(cells)
        
        with open(filename, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            if suffix == "_출전표" and summary_rows:
                writer.writerows(summary_rows); writer.writerow([])
            if headers: writer.writerow(headers)
            writer.writerows(data_rows)
        print(f"✅ 저장 완료")
    except:
        print(f"❌ {suffix[1:]} 추출 실패")

# ==========================================
# 10. 통합 훈련 상세 파일 생성 (임시 저장용)
# 목표: 전역변수에 모아둔 훈련 정보를 CSV 파일 하나로 일단 저장
# ==========================================
def create_unified_training_details(folder_path, filename_prefix):
    global all_training_details_to_merge
    if not all_training_details_to_merge: return
    
    outfile = os.path.join(folder_path, f"{filename_prefix}_조교상세_통합.csv")
    try:
        df = pd.DataFrame(all_training_details_to_merge)
        # 마번, 마명 컬럼을 맨 앞으로 오게 순서 정리
        cols = ['마번', '마명'] + [c for c in df.columns if c not in ['마번', '마명']]
        df[cols].to_csv(outfile, index=False, encoding='utf-8-sig')
        print(f"✅ 조교 상세 통합 완료 (총 {len(df)}행)")
    except Exception as e:
        print(f"❌ 조교 통합 저장 오류: {e}")

# ==========================================
# 11. 경주 하나 처리 함수 (단일 경주 처리)
# 목표: 특정 경주(예: 1경주)를 클릭하고 들어가서 탭들을 순회하며 데이터 수집
# ==========================================
def extract_single_race(driver, wait, race_num, idx):
    global all_training_details_to_merge
    all_training_details_to_merge = [] # 새 경주 시작하니까 바구니 비우기

    print(f"\n🏁 {race_num}경주 데이터 처리 시작...")
    is_jeju = False

    try:
        # 1. 해당 경주 번호 링크 클릭 (stale 방지 재시도 로직 포함)
        # [참고] 이미 safe_move_to_list_page에서 리스트가 떴는지 확인했으므로 바로 클릭 시도
        # [중요 수정]
        # - safe_move_to_list_page와 동일하게, "일자별 경주정보" 표의 경주 번호 컬럼 안만 검색
        # - 이렇게 하면 페이지 다른 곳(메뉴/푸터 등)의 같은 숫자 링크를 잘못 클릭하는 문제를 방지
        link_xpath = (
            f"(//*[@id='contents']//div[contains(@class,'tableType2')]"
            f"//table//tr/td[3]/a[normalize-space(text())='{race_num}'])[{idx}]"
        )
        max_click_retries = 3
        for attempt in range(max_click_retries):
            try:
                link = wait.until(EC.element_to_be_clickable((By.XPATH, link_xpath)))
                driver.execute_script("arguments[0].click();", link) # 클릭!
                
                # [안전장치] 클릭 후 상세 페이지가 떴는지 확인 (tableType1이 보여야 함)
                wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'tableType1')))
                break
            except (StaleElementReferenceException, TimeoutException):
                # 에러나면 잠시 쉬었다가 재시도
                if attempt == max_click_retries - 1:
                    print(f"❌ {race_num}경주 상세 페이지 진입 실패")
                    return False
                time.sleep(0.5)
        
        # 2. 페이지 로딩 후 정보(날짜, 지역 등) 파악해서 파일명 만들기
        h_txt = driver.find_element(By.CLASS_NAME, 'tableType1').text
        if "제주" in h_txt: is_jeju = True # 제주는 부마 정보가 없어서 다르게 처리
        
        try:
            date_match = re.search(r'(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(\(.\))', h_txt)
            loc_match = re.search(r'(서울|부산|부경|제주)', h_txt)
            race_match = re.search(r'제?(\d+)경주', h_txt) 
            
            if date_match and loc_match and race_match:
                year, month, day, dow = date_match.groups()
                loc = loc_match.group(1)
                if loc == "부경": loc = "부산"
                race_n = race_match.group(1)
                fname = f"{year}{month.zfill(2)}{day.zfill(2)}{dow}_{loc}_{race_n}경주"
            else:
                fname = "result"
        except: fname = "result"
        
        # 3. 저장할 폴더 생성
        folder = create_folder_structure(h_txt)
        
        # 4. 상단 요약 정보 읽기
        sum_rows = []
        try:
            sum_tbl = driver.find_element(By.CLASS_NAME, 'tableType1')
            for tr in sum_tbl.find_elements(By.TAG_NAME, 'tr'):
                r = [t.text.strip() for t in tr.find_elements(By.XPATH, "./th | ./td")]
                if r: sum_rows.append(r)
        except: pass

        # 5. 수집할 탭 목록 정의 (탭 이름, XPath 위치)
        tabs = [
            ("_출전표", ""), # 첫 화면이라 클릭 불필요
            ("_진료현황", "//*[@id='contents']/form/ul/li[2]/a"),
            ("_체중현황", "//*[@id='contents']/form/ul/li[3]/a"),
            ("_심판리포트", "//*[@id='contents']/form/ul/li[10]/a"),
            ("_조교현황", "//*[@id='contents']/form/ul/li[7]/a"), 
            ("_말기수상관전적", "//*[@id='contents']/form/ul/li[8]/a"),
            ("_최근10회전적", "//*[@id='contents']/form/ul/li[9]/a")
        ]
        
        # 6. 각 탭을 돌면서 데이터 수집
        for suffix, xpath in tabs:
            if xpath:
                try:
                    # 탭 버튼을 찾아서 클릭
                    btn = wait.until(EC.element_to_be_clickable((By.XPATH, xpath)))
                    btn.click()
                    time.sleep(1.0) 
                    wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'tableType2')))
                except: continue
            
            s_rows = sum_rows if suffix == "_출전표" else []

            # 탭 종류에 따라 맞는 함수 실행
            if suffix == "_출전표":
                if is_jeju: extract_and_save_table_basic(driver, wait, fname, suffix, s_rows, folder)
                else: extract_and_save_table_with_sire(driver, wait, fname, suffix, s_rows, folder)
            elif suffix == "_최근10회전적":
                extract_10race_history(driver, wait, fname, folder)
            else:
                extract_and_save_table_basic(driver, wait, fname, suffix, s_rows, folder)
        
        # 7. 모아둔 조교 데이터 저장
        if not is_jeju and all_training_details_to_merge:
            create_unified_training_details(folder, fname)
            
        # 8. 최종 통합 파일 생성
        merge_csv_files_for_race(folder, fname)
        return True
        
    except Exception as e:
        print(f"❌ 경주 처리 중 오류: {e}")
        return False

# ==========================================
# 12. 메인 실행 함수 (프로그램의 시작점)
# 목표: 사용자 입력을 받고, 전체 반복문을 돌리는 총지휘자
# ==========================================
def main_extraction():
    print("--- 🏇 경마 데이터 수집기 (안정화 버전) ---")
    try:
        # 사용자에게 정보 입력 받기
        meet = input("경마장 (1:서울, 2:제주, 3:부산): ").strip()
        # 입력값에 따라 접속 주소 결정
        url = f'https://race.kra.co.kr/chulmainfo/ChulmaDetailInfoList.do?Act=02&Sub=1&meet={meet}' if meet in ['1','2','3'] else 'https://race.kra.co.kr/chulmainfo/ChulmaDetailInfoList.do?Act=02&Sub=1&meet=1'
        
        start = int(input("시작 경주 번호: "))
        end = int(input("종료 경주 번호: "))
        idx = int(input("링크 순번 (보통 1): "))
    except:
        print("기본 설정으로 시작합니다.")
        url = 'https://race.kra.co.kr/chulmainfo/ChulmaDetailInfoList.do?Act=02&Sub=1&meet=1'
        start, end, idx = 1, 1, 1

    # 브라우저 시작
    driver = get_driver_and_load_page(url)
    if not driver: return
    wait = WebDriverWait(driver, 10) # 최대 10초까지 기다려주는 도구
    
    try:
        # 시작 경주부터 종료 경주까지 반복
        for r in range(start, end + 1):
            # [수정된 핵심 로직]
            # 경주를 클릭하기 전에, 지금 화면이 목록 페이지가 맞는지 확인합니다.
            # 만약 메인 페이지로 튕겼다면 다시 목록으로 돌아옵니다.
            if not safe_move_to_list_page(driver, wait, url, r, idx):
                print(f"⚠️ {r}경주 목록 접근 실패. 다음 경주로 넘어갑니다.")
                continue

            # 페이지가 안전하면 데이터 수집 함수 실행
            extract_single_race(driver, wait, r, idx)
            
            # (예전에는 여기서 driver.get(url)을 했지만, 이제 safe_move_to_list_page가 그 역할을 합니다)
            
    finally:
        # 프로그램이 끝나면 브라우저를 닫습니다.
        driver.quit()
        print("\n🎉 모든 작업이 완료되었습니다.")

# 이 파일이 직접 실행될 때만 main_extraction()을 실행합니다.
if __name__ == "__main__":
    main_extraction()
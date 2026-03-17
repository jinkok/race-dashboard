import pandas as pd
import glob
import os
import re
from datetime import datetime

def parse_header_info(lines):
    """
    파일 상단의 주석(#) 라인에서 경주 정보를 추출합니다.
    """
    info = {
        '출전_경주일자': None,
        '출전_경주번호': None,
        '출전_출발시간': None,
        '출전_등급': None,
        '출전_거리': None,
        '출전_조건': None
    }
    
    for line in lines:
        line = line.strip()
        if not line.startswith('#'):
            continue
            
        # 1. 날짜 추출 (예: 2025년12월26일)
        if not info['출전_경주일자']:
            date_match = re.search(r'(\d{4}년\s*\d{1,2}월\s*\d{1,2}일)', line)
            if date_match:
                info['출전_경주일자'] = date_match.group(1)
        
        # 2. 경주번호 추출 (예: 제1경주)
        if not info['출전_경주번호']:
            race_match = re.search(r'제\s*(\d+)\s*경주', line)
            if race_match:
                info['출전_경주번호'] = race_match.group(1) + '경주'
        
        # 3. 출발 시간 추출 (예: 11:15)
        if not info['출전_출발시간']:
            time_match = re.search(r'(\d{1,2}:\d{2})', line)
            if time_match:
                info['출전_출발시간'] = time_match.group(1)
            
        # 4. 등급 및 거리 추출
        if '등급' in line or 'M' in line:
            info['출전_조건'] = line.lstrip('#').strip()
            
            class_match = re.search(r'(\S*등급)', line)
            if class_match:
                info['출전_등급'] = class_match.group(1)
            
            dist_match = re.search(r'(\d{4}M|\d{3}M)', line)
            if dist_match:
                info['출전_거리'] = dist_match.group(1)

    return info

def parse_horse_row(line):
    """
    [말] 로 시작하는 행에서 정보를 추출합니다.
    """
    pattern = r'\[말\]\s+(\d+)번\s+(\S+)\s+(\S+)\s+(\d+)\s+세\s+(\S+)\s+\[기수\]\s+(\S+)\s+([\d.]+)'
    match = re.search(pattern, line)
    
    if match:
        return {
            '출전마_마번': match.group(1),
            '출전마_마명': match.group(2),
            '출전마_성별': match.group(3),
            '출전마_나이': match.group(4),
            '출전마_산지': match.group(5),
            '출전마_기수': match.group(6),
            '출전마_부담중량': match.group(7)
        }
    return None

def process_single_file(filename):
    """
    하나의 파일을 읽어 리스트로 반환합니다.
    """
    data_rows = []
    try:
        encodings = ['cp949', 'utf-8-sig', 'utf-8']
        lines = []
        for enc in encodings:
            try:
                with open(filename, 'r', encoding=enc) as f:
                    lines = f.readlines()
                break
            except UnicodeDecodeError:
                continue
        if not lines: return []

    except Exception as e:
        print(f"파일 읽기 에러 ({filename}): {e}")
        return []

    race_info = parse_header_info(lines[:10]) 
    current_horse_info = None
    header_columns = None
    
    for line in lines:
        line = line.strip()
        if not line: continue
        if line.startswith('순,'):
            header_columns = line.split(',')
            continue
        if line.startswith('[말]'):
            current_horse_info = parse_horse_row(line)
            continue
        
        first_char = line.split(',')[0]
        if first_char.isdigit() and header_columns and current_horse_info:
            row_values = line.split(',')
            row_dict = {}
            for i, col_name in enumerate(header_columns):
                if i < len(row_values):
                    row_dict[col_name] = row_values[i]
            
            row_dict.update(race_info)
            row_dict.update(current_horse_info)
            row_dict['출처파일'] = os.path.basename(filename)
            data_rows.append(row_dict)
            
    return data_rows

def merge_csv_files(target_folder=".", output_filename=None):
    """
    target_folder 내의 파일을 검색하여 통합합니다.
    추출된 '출전 경주일자'와 경마장 이름을 파일명에 포함합니다.
    """
    # 1. 파일 검색 (모든 경마장 지원)
    search_pattern = os.path.join(target_folder, "**", "*최근10회전적*.csv")
    all_files = glob.glob(search_pattern, recursive=True)
    
    # 통합 파일이나 숨김 파일 등은 제외
    all_files = [f for f in all_files if "통합" not in os.path.basename(f) and not os.path.basename(f).startswith('.')]
    
    if not all_files:
        print(f"'{target_folder}' 폴더에서 대상 파일을 찾을 수 없습니다.")
        return

    print(f"총 {len(all_files)}개의 파일을 찾았습니다. 분석을 시작합니다...\n")
    
    all_data = []
    for filename in all_files:
        file_data = process_single_file(filename)
        all_data.extend(file_data)

    if all_data:
        # 2. 파일명용 날짜 추출 (첫 번째 행의 '출전_경주일자' 기준)
        date_prefix = ""
        sample_date = all_data[0].get('출전_경주일자') # 예: "2025년12월26일"
        
        if sample_date:
            # "2025년12월26일"에서 숫자만 뽑아 "20251226" 형태로 변환
            date_match = re.search(r'(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일', sample_date)
            if date_match:
                y, m, d = date_match.groups()
                date_prefix = f"{y}{int(m):02d}{int(d):02d}"
        
        # 만약 데이터에서 날짜를 못 찾으면 오늘 날짜 사용
        if not date_prefix:
            date_prefix = datetime.now().strftime("%Y%m%d")
        
        # 3. 경마장 이름 추출 (첫 번째 파일명에서)
        track_name = ""
        if all_files:
            first_file_name = os.path.basename(all_files[0])
            track_match = re.search(r'_(서울|부산|제주)_', first_file_name)
            if track_match:
                track_name = track_match.group(1) + "_"
        
        # 파일명 생성
        if not output_filename:
            if track_name:
                output_filename = f"{date_prefix}_{track_name}경마_통합10회전적_상세.csv"
            else:
                output_filename = f"{date_prefix}_경마_통합10회전적_상세.csv"

        final_df = pd.DataFrame(all_data)
        
        # 컬럼 순서 정리
        cols = list(final_df.columns)
        priority_cols = [
            '출전_경주일자', '출전_경주번호', '출전_출발시간', '출전_등급', '출전_거리', 
            '출전마_마번', '출전마_마명', '출전마_기수', '출전마_성별', '출전마_나이', '출전마_부담중량',
            '순', '경주일자', '등급', '거리', '기록', '순위'
        ]
        
        sorted_cols = [c for c in priority_cols if c in cols]
        remaining_cols = [c for c in cols if c not in sorted_cols]
        final_df = final_df[sorted_cols + remaining_cols]

        # 저장
        final_df.to_csv(output_filename, index=False, encoding='utf-8-sig')
        print(f"\n성공적으로 저장되었습니다: {output_filename}")
        print(f"총 데이터 행 수: {len(final_df)}")
    else:
        print("데이터를 추출하지 못했습니다.")

if __name__ == "__main__":
    input_path = input("검색할 폴더 경로를 입력하세요 (엔터키를 치면 현재 폴더 검색): ").strip()
    if not input_path:
        input_path = "."
    merge_csv_files(target_folder=input_path)
import pdfplumber
import re
import os

# Configuration
# Hardcoded defaults for manual run (if no target_date_str provided)
DEFAULT_SEOUL = "data/0_raw/s_run_hr_260302_all.pdf"
DEFAULT_BUSAN = "data/0_raw/b_run_hr_260301_all.pdf"

def parse_race_data(input_file):
    races = []
    race_date = "YYYYMMDD"
    
    print(f"Opening {input_file}...")
    try:
        with pdfplumber.open(input_file) as pdf:
            full_content = ""
            for page in pdf.pages:
                text = page.extract_text(layout=True)
                if text:
                    full_content += text + "\n--PAGE_END--\n"
                    # Extract date from footer: [2026.02.15]
                    if race_date == "YYYYMMDD":
                        date_m = re.search(r'\[(\d{4})\.(\d{2})\.(\d{2})\]', text)
                        if date_m:
                            race_date = f"{date_m.group(1)}{date_m.group(2)}{date_m.group(3)}"
    except Exception as e:
        print(f"Error opening PDF: {e}")
        return [], "YYYYMMDD"

    pages = full_content.split('--PAGE_END--')
    race_pages = {}
    
    for p_text in pages:
        m = re.search(r'(서울|부산경남|제주|부산|부경)\s+(\d+)경주', p_text)
        if m:
            region = m.group(1).strip()
            rid = (region, m.group(2))
            if rid not in race_pages: race_pages[rid] = []
            race_pages[rid].append(p_text)

    # Initialize centers
    t1_centers = [12, 34, 52, 75, 91]
    t2_centers = [14, 35, 55, 79, 102]

    for rid, p_texts in race_pages.items():
        region, rno = rid
        combined_text = "\n".join(p_texts)
        
        distance = "0"
        start_time = "00:00"
        avg_record = "0:00.0"
        
        dist_m = re.search(r'(\d{3,4})\s*[mM]', combined_text)
        if dist_m: distance = dist_m.group(1)
        
        time_m = re.search(r'(\d{1,2})\s*[:시\s]\s*(\d{2})\s*[분출]', combined_text)
        if time_m:
            try: start_time = f"{int(time_m.group(1)):02d}:{int(time_m.group(2)):02d}"
            except: pass
            
        if "평균기록" in combined_text:
            times = re.findall(r'(\d\s*:\s*\d{2}\s*\.\s*\d)', combined_text)
            if times:
                avg_record = times[0].replace(" ", "")

        race_data = {
            'region': region, 'rno': rno, 'distance': distance, 'time': start_time, 'avg_record': avg_record,
            'tips': {
                '복승률': [], '거리승률': [], '상금': [], '기록': [], '지수': [],
                '초반': [], '종반': []
            }
        }
        
        lines = combined_text.split('\n')
        in_table = None
        for line in lines:
            if "레이팅" in line and "복승률" in line:
                in_table = 1
                headers = ["레이팅", "승률", "복승률", "m 승률", "기록"]
                new_centers = []
                for h in headers:
                    pos = line.find(h)
                    if pos != -1: new_centers.append(pos)
                if len(new_centers) >= 3: t1_centers = new_centers
                continue
            if "최근" in line and "상금" in line and "6개월" in line:
                in_table = 2
                headers = ["최근 1년 상금", "최근 6개월 상금", "초반 200m", "종반 200m", "속도지수"]
                new_centers = []
                for h in headers:
                    pos = line.find(h)
                    if pos != -1: new_centers.append(pos)
                if len(new_centers) >= 3: t2_centers = new_centers
                continue
            
            if in_table:
                matches = list(re.finditer(r'(\d+)\s*([가-힣\[\]\s]{2,})\s+([\d\.:%]+(?:백만)?)', line))
                for m in matches:
                    no, name, val = m.group(1), m.group(2).replace(" ", ""), m.group(3)
                    if no == "0": continue  # Filter out noise like '0 백만' from '백만원' text
                    
                matches = list(re.finditer(r'(\d+)\s*([가-힣\[\]\s]{2,})\s+([\d\.:%]+(?:백만)?)', line))
                # Reset counters for each line to track 1st, 2nd, etc. occurrence of data types
                line_type_counts = {"prize": 0, "pct": 0, "time": 0, "idx": 0, "int": 0}

                for m in matches:
                    no, name, val = m.group(1), m.group(2).replace(" ", ""), m.group(3)
                    if no == "0": continue  # Filter out noise like '0 백만' from '백만원' text
                    
                    if in_table == 1:
                        # Table 1: Rating (0), WinRate (1), BokWin (2), DistWin (3), Record (4)
                        if ":" in val:
                            col_idx = 4
                        elif "%" in val:
                            line_type_counts["pct"] += 1
                            col_idx = line_type_counts["pct"] # 1st %, 2nd %, 3rd %
                        else:
                            col_idx = 0 # Rating
                        
                        if col_idx == 1: pass # 1st % is WinRate (not in tips)
                        elif col_idx == 2: race_data['tips']['복승률'].append((no, name, val))
                        elif col_idx == 3: race_data['tips']['거리승률'].append((no, name, val))
                        elif col_idx == 4: race_data['tips']['기록'].append((no, name, val))
                    elif in_table == 2:
                        # Table 2: 1yPrize (0), 6mPrize (1), EarlyTime (2), LateTime (3), Index (4)
                        if "백만" in val:
                            line_type_counts["prize"] += 1
                            col_idx = line_type_counts["prize"] - 1 # 0 or 1
                        elif "." in val:
                            line_type_counts["time"] += 1
                            col_idx = line_type_counts["time"] + 1 # 2 or 3
                        else:
                            col_idx = 4 # Speed Index
                        
                        if col_idx == 1: race_data['tips']['상금'].append((no, name, val))
                        elif col_idx == 2: race_data['tips']['초반'].append((no, name, val))
                        elif col_idx == 3: race_data['tips']['종반'].append((no, name, val))
                        elif col_idx == 4: race_data['tips']['지수'].append((no, name, val))
        races.append(race_data)
    return races, race_date

def format_output(races):
    def skey(r):
        region_order = {"서울": 0, "부산경남": 1, "부산": 1, "부경": 1, "제주": 2}
        return (region_order.get(r['region'], 9), int(r['rno']))
        
    sorted_races = sorted(races, key=skey)
    res = []
    for r in sorted_races:
        region_name = r['region']
        if region_name == "부경": region_name = "부산"
        res.append(f"{region_name} {r['rno']}경주 ({r['time']} 출발, {r['distance']}m)")
        res.append(f"우승마 평균기록: {r['avg_record']}")
        res.append("")
        res.append("DATA TIPS 항목별 TOP 5 (수치 포함)")
        tip_sections = [
            ("[복승률]", '복승률', ""),
            (f"[{r['distance']}m 승률]", '거리승률', ""),
            ("[최근 6개월 상금]", '상금', "백만원"),
            (f"[{r['distance']}m 최고 기록]", '기록', ""),
            ("[속도지수]", '지수', "")
        ]
        for title, key, unit in tip_sections:
            res.append(title)
            data = r['tips'].get(key, [])
            unique_data = []
            seen_no = set()
            for item in data:
                if item[0] not in seen_no:
                    unique_data.append(item)
                    seen_no.add(item[0])
            if not unique_data: res.append("(데이터 없음)")
            else:
                for i in range(1, 6):
                    if i <= len(unique_data):
                        no, name, val = unique_data[i-1]
                        res.append(f"{no} {name} ({val.replace('백만','').strip()}{unit})")
                    else:
                        missing_range = f"{i}~5" if i < 5 else "5"
                        res.append(f"({missing_range}위 데이터 없음)")
                        break
            res.append("")
        res.append("구간별 기록 (단위: 초)")
        record_sections = [("[경주 초반 (200m)]", '초반'), ("[경주 후반 (200m)]", '종반')]
        for title, key in record_sections:
            res.append(title)
            data = r['tips'].get(key, [])
            unique_data = []
            seen_no = set()
            for item in data:
                if item[0] not in seen_no:
                    unique_data.append(item)
                    seen_no.add(item[0])
            if not unique_data: res.append("(데이터 없음)")
            else:
                for i in range(1, 6):
                    if i <= len(unique_data):
                        no, name, val = unique_data[i-1]
                        res.append(f"{no} {name} ({val}초)")
                    else:
                        missing_range = f"{i}~5" if i < 5 else "5"
                        res.append(f"({missing_range}위 데이터 없음)")
                        break
            res.append("")
        res.append("="*30 + "\n")
    return "\n".join(res)

def run_parser(target_date_str=None):
    input_files = []
    
    if target_date_str:
        # Convert YYYYMMDD to YYMMDD (e.g., 20260320 -> 260320)
        yymmdd = target_date_str[2:] if len(target_date_str) == 8 else target_date_str
        
        # Look for Seoul (s_) and Busan (b_) files for this date
        raw_dir = "data/0_raw"
        if os.path.exists(raw_dir):
            for f in os.listdir(raw_dir):
                if f.endswith(".pdf") and (f"_{yymmdd}_" in f or f"_{yymmdd}." in f):
                    input_files.append(os.path.join(raw_dir, f))
    
    # Fallback to defaults if no files found and no date provided
    if not input_files and not target_date_str:
        if os.path.exists(DEFAULT_SEOUL): input_files.append(DEFAULT_SEOUL)
        if os.path.exists(DEFAULT_BUSAN): input_files.append(DEFAULT_BUSAN)

    if not input_files:
        print(f"No PDF files found for date: {target_date_str}")
        return

    for f_in in input_files:
            
        res = parse_race_data(f_in)
        if res:
            r_data, r_date = res
            # Group by region
            regions = sorted(list(set(r['region'] for r in r_data)))
            for reg in regions:
                filtered_races = [r for r in r_data if r['region'] == reg]
                reg_name = reg if reg != "부경" else "부산"
                
                # Use target_date_str if provided, else use parser extracted date
                final_date = target_date_str if target_date_str else r_date
                out_name = f"data/1_intermediate/{final_date}[{reg_name}]easyrace.txt"
                
                # ensure directory exists
                os.makedirs(os.path.dirname(out_name), exist_ok=True)
                
                with open(out_name, "w", encoding="utf-8") as f:
                    f.write(format_output(filtered_races))
                print(f"Saved {len(filtered_races)} races to {out_name}")

if __name__ == "__main__":
    run_parser()
import pandas as pd
import json
import os
import re
import csv
import io
import shutil
import sys

# 프로젝트 루트 경로를 path에 추가하여 다른 폴더의 모듈을 가져올 수 있게 합니다.
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "../"))
if project_root not in sys.path:
    sys.path.append(project_root)

# 통합 및 변환 모듈 가져오기
from src.parsers.integrate_entry_forms import integrate_entry_forms
from src.converters.Integration10raceRecord import merge_csv_files as merge_ten_records
from src.converters.integrate_reports import integrate_data as integrate_judicial_medical
from src.converters.MergeToEqualdateJson import merge_race_files as merge_regional_data
from src.parsers.RaceDataParser import run_parser as run_pdf_parser

class RaceDataPipeline:
    def __init__(self):
        pass

    # ==========================================
    # 1. 출전표 변환 (EntrySheet)
    # ==========================================
    def convert_entry_sheet(self, input_path, output_path):
        print(f"[1/5] 출전표 변환 중... ({input_path})")
        try:
            with open(input_path, 'r', encoding='utf-8-sig') as f:
                lines = f.readlines()
        except UnicodeDecodeError:
            try:
                with open(input_path, 'r', encoding='cp949') as f:
                    lines = f.readlines()
            except Exception as e:
                print(f"Error reading entry sheet: {e}")
                return False

        processed_data = []
        current_race_info = {'race_no': None, 'distance': '', 'class': '', 'start_time': '', 'conditions': ''}
        expecting_race_details = False

        race_pattern = re.compile(r'제\s*(\d+)\s*경주')
        time_pattern = re.compile(r'\d{2}:\d{2}')
        distance_pattern = re.compile(r'(\d+)M', re.IGNORECASE)

        reader = csv.reader(lines)

        for row in reader:
            if not row: continue
            row_str = " ".join(row)

            # 경주 번호 파싱
            race_match = race_pattern.search(row_str)
            if race_match:
                current_race_info['race_no'] = int(race_match.group(1))
                time_match = time_pattern.search(row_str)
                current_race_info['start_time'] = time_match.group(0) if time_match else ''
                expecting_race_details = True
                current_race_info['distance'] = ''
                current_race_info['class'] = ''
                current_race_info['conditions'] = ''
                continue

            # 상세 정보 파싱
            if expecting_race_details and not row[0].strip().isdigit():
                full_text = " ".join(row)
                dist_match = distance_pattern.search(full_text)
                if dist_match:
                    current_race_info['distance'] = dist_match.group(1)
                
                tokens = row[0].split()
                for token in tokens:
                    if '등급' in token:
                        current_race_info['class'] = token
                        break
                current_race_info['conditions'] = row_str.strip()
                if dist_match: expecting_race_details = False
                continue

            # 말 데이터 파싱
            if row[0].strip().isdigit() and current_race_info['race_no'] is not None:
                try:
                    raw_weight = row[6].strip()
                    entry = {
                        'race_no': current_race_info['race_no'],
                        'distance': current_race_info['distance'],
                        'class': current_race_info['class'],
                        'start_time': current_race_info['start_time'],
                        'conditions': current_race_info['conditions'].replace('"', ''),
                        'horse_no': int(row[0]),
                        'name': row[1].strip(),
                        'origin': row[2].strip(),
                        'sex': row[3].strip(),
                        'age': int(row[4]) if row[4].strip().isdigit() else row[4],
                        'rating': row[5].strip(), 
                        'training_cnt': row[11].strip(),
                        'weight': raw_weight, 
                        'jockey': row[8].strip(),
                        'trainer': row[9].strip(),
                        'owner': row[10].strip(),
                        'grade': row[16].strip() if len(row) > 16 else '',
                        'participation_period': row[12].strip(),
                        'equipment': row[13].strip(),
                        'sire': row[15].strip() if len(row) > 15 else ''
                    }
                    processed_data.append(entry)
                except:
                    continue

        df = pd.DataFrame(processed_data)
        target_columns = [
            'race_no', 'distance', 'class', 'start_time', 'conditions',
            'horse_no', 'name', 'origin', 'sex', 'age', 'rating', 
            'training_cnt', 'weight', 'jockey', 'trainer', 'owner', 'grade', 
            'participation_period', 'equipment', 'sire'
        ]
        if not df.empty:
            for col in target_columns:
                if col not in df.columns: df[col] = ''
            df = df[target_columns]

        df.to_csv(output_path, index=False, encoding='utf-8-sig')
        return True

    # ==========================================
    # 2. 최근 전적 변환 (RecentHistory)
    # ==========================================
    def convert_recent_history(self, input_path, output_path):
        print(f"[2/5] 최근 전적 변환 중... ({input_path})")
        try:
            df = pd.read_csv(input_path, encoding='utf-8-sig')
        except:
            try:
                df = pd.read_csv(input_path, encoding='cp949')
            except Exception as e:
                print(f"Error reading history: {e}")
                return False

        processed_data = []
        for index, row in df.iterrows():
            try:
                race_no_str = str(row['출전_경주번호'])
                race_no = int(re.search(r'\d+', race_no_str).group()) if re.search(r'\d+', race_no_str) else 0
                horse_no = int(row['출전마_마번'])
                
                raw_date = str(row['경주일자'])
                date_match = re.search(r'(\d{4})/(\d{2})/(\d{2})', raw_date)
                if date_match:
                    formatted_date = f"{date_match.group(1)[2:]}-{date_match.group(2)}-{date_match.group(3)}"
                else:
                    formatted_date = raw_date

                raw_class = str(row.get('등급', '')).strip()
                raw_type = str(row.get('종류', '')).strip()
                if '등급' in raw_class:
                    race_class = raw_class.replace('등급', '')
                elif raw_class == '-' or raw_class == '':
                    race_class = '주행' if raw_type == '주' else '주행'
                else:
                    race_class = raw_class

                distance = f"{row['거리']}m"
                raw_rank = str(row['순위'])
                result_rank = raw_rank.split('/')[0] if '/' in raw_rank else raw_rank

                def clean_time(t):
                    t = str(t)
                    return t.replace('0:', '') if t.startswith('0:') else t

                entry = {
                    'race_no': race_no,
                    'horse_no': horse_no,
                    'date': formatted_date,
                    'class': race_class,
                    'distance': distance,
                    'record': row['기록'],
                    'result_rank': result_rank,
                    'weight': row['중량'],
                    'jockey': row['기수명'],
                    's1f': clean_time(row['S-1F']),
                    'g3f': clean_time(row['G-3F']),
                    'g1f': clean_time(row['G-1F'])
                }
                processed_data.append(entry)
            except:
                continue

        result_df = pd.DataFrame(processed_data)
        target_columns = ['race_no', 'horse_no', 'date', 'class', 'distance', 'record', 'result_rank', 'weight', 'jockey', 's1f', 'g3f', 'g1f']
        if not result_df.empty:
            result_df = result_df[target_columns]

        result_df.to_csv(output_path, index=False, encoding='utf-8-sig')
        return True

    # ==========================================
    # 3. 경주 통계/분석 변환 (RaceStats)
    # ==========================================
    def convert_race_stats(self, input_path, output_path):
        print(f"[3/5] 경주 통계 분석 변환 중... ({input_path})")
        try:
            with open(input_path, 'r', encoding='utf-8') as f: lines = f.readlines()
        except:
            try:
                with open(input_path, 'r', encoding='cp949') as f: lines = f.readlines()
            except Exception as e:
                print(f"Error reading stats: {e}")
                return False

        data = []
        current_race_no = None
        current_location = None
        current_type = None
        current_rank_counter = 1 
        
        race_header_pat = re.compile(r'(서울|부산|제주).*?(\d+)경주')
        avg_record_pat = re.compile(r'(?:\*\s*)?우승마\s*평균기록[:\s]+([\d:.]+)')
        rank_pat = re.compile(r'^\s*(\d+)\s+([^\s\(]+)(?:\s*\((.*)\))?')
        
        section_map = {
            '최고 기록': 'best_record',
            '초반': 'fast_start', 
            '후반': 'fast_finish', 
            '상금': 'prize_money',
            '복승률': 'bok_win', 
            '입상률': 'win_rate', 
            '기록': 'record',
            '승률': 'dist_win', 
            '속도지수': 'speed_index'
        }

        for line in lines:
            line = line.strip()
            if not line: continue
            
            race_match = race_header_pat.search(line)
            if race_match:
                current_location = race_match.group(1)
                current_race_no = int(race_match.group(2))
                current_type = None
                continue
            
            if current_race_no is None: continue

            avg_match = avg_record_pat.search(line)
            if avg_match:
                data.append({
                    'location': current_location,
                    'race_no': current_race_no, 
                    'type': 'avg_record', 
                    'rank': '-', 
                    'horse_no': '-', 
                    'horse_name': '-', 
                    'value': avg_match.group(1).strip()
                })
                continue

            if line.startswith('[') and line.endswith(']'):
                section_title = line[1:-1]
                found = False
                for key, val in section_map.items():
                    if key in section_title:
                        current_type = val
                        found = True
                        break
                if not found:
                    current_type = "best_record" if "최고 기록" in section_title else None
                
                current_rank_counter = 1
                continue

            if current_type:
                horse_no = None
                horse_name = None
                clean_val = ""
                rank = current_rank_counter

                # 일반 통계 데이터 파싱 (마번, 마명, 값)
                # 1위: 5번 파이어러너 - 12.5백만원 / 7 빅토리아축제 (50.0%) / 12 마더원더풀 (1:22.4)
                
                # 형식 A: "1위: 5번 파이어러너 - 12.5" 또는 "1위: 파이어러너 (12.5)"
                match_a = re.search(r'(\d+)위:\s*(?:(\d+)번\s+)?([^\s\(-]+)(?:\s*[\(-]\s*(.*))?$', line)
                # 형식 B: "7 빅토리아축제 (50.0%)" (데이터 팁 형식)
                match_b = re.match(r'^\s*(\d+)\s+([^\s\(-]+)(?:\s*[\(-]\s*(.*))?$', line)
                
                if match_a:
                    rank = int(match_a.group(1))
                    horse_no = int(match_a.group(2)) if match_a.group(2) else rank # 번호 없으면 순위를 마번으로 (안전장치)
                    horse_name = match_a.group(3).strip()
                    clean_val = match_a.group(4).strip() if match_a.group(4) else ""
                    clean_val = clean_val.replace(')', '').strip()
                elif match_b:
                    horse_no = int(match_b.group(1))
                    horse_name = match_b.group(2).strip()
                    clean_val = match_b.group(3).strip() if match_b.group(3) else ""
                    clean_val = clean_val.replace(')', '').strip()
                    rank = current_rank_counter

                if horse_no is not None:
                    if clean_val:
                        # 단위 제거 및 정제
                        clean_val = clean_val.replace('초', '').replace('백만원', '').strip()
                        if current_type == 'prize_money':
                            try:
                                num_val = float(clean_val)
                                clean_val = f"{int(num_val * 100)}만원"
                            except: pass
                    elif current_type == 'fast_start' and not clean_val:
                        clean_val = "초반우수"
                    
                    data.append({
                        'location': current_location,
                        'race_no': current_race_no,
                        'type': current_type,
                        'rank': rank,
                        'horse_no': horse_no,
                        'horse_name': horse_name,
                        'value': clean_val
                    })
                    current_rank_counter += 1

        df = pd.DataFrame(data)
        if not df.empty: 
            df = df[['location', 'race_no', 'type', 'rank', 'horse_no', 'horse_name', 'value']]
        df.to_csv(output_path, index=False, encoding='utf-8-sig')
        return True

    # ==========================================
    # 4. 전문가 추천 변환 (ExpertPick) - 선행마 추가 수정
    # ==========================================
    def convert_expert_pick(self, input_path, output_path):
        print(f"[4/5] 전문가 추천 변환 중... ({input_path})")
        if not os.path.exists(input_path):
            print("Expert pick file not found")
            return False

        try:
            with open(input_path, 'r', encoding='utf-8') as f: content = f.read()
        except:
            with open(input_path, 'r', encoding='cp949') as f: content = f.read()

        split_pattern = r'((?:서울|부산|제주)\s*제?\s*\d+경주:)'
        chunks = re.split(split_pattern, content)
        
        data_rows = []
        current_race_no = None
        current_location = None

        for chunk in chunks:
            chunk = chunk.strip()
            if not chunk: continue

            header_match = re.search(r'(서울|부산|제주)\s*제?\s*(\d+)경주:', chunk)
            if header_match:
                current_location = header_match.group(1)
                current_race_no = int(header_match.group(2))
                continue
            
            if current_race_no is None: continue

            picks_match = re.search(r'추천마\s*:(.*)', chunk)
            upset_match = re.search(r'복병마\s*:(.*)', chunk)
            # 선행마 파싱 추가
            front_match = re.search(r'(?:초반 빠른 마필\s*)?\(선행\)\s*:(.*)', chunk)
            
            # 코멘트 섹션 추출 범위 조정 (선행마 텍스트가 코멘트와 섞이지 않도록)
            # 보통 코멘트는 맨 앞에 나오므로 picks_match 전까지가 코멘트
            comment_end_index = len(chunk)
            if picks_match: comment_end_index = min(comment_end_index, picks_match.start())
            if upset_match: comment_end_index = min(comment_end_index, upset_match.start())
            if front_match: comment_end_index = min(comment_end_index, front_match.start())

            comment_section = chunk[:comment_end_index]
            
            picks_text = picks_match.group(1) if picks_match else ""
            upsets_text = upset_match.group(1) if upset_match else ""
            front_text = front_match.group(1) if front_match else "" # 선행마 텍스트

            picks = re.findall(r'\(?(\d+)\)?', picks_text)
            upsets = re.findall(r'\(?(\d+)\)?', upsets_text)
            fronts = re.findall(r'\(?(\d+)\)?', front_text) # 선행마 숫자 추출
            
            horse_comments = []
            pattern_comment = re.compile(r'\((\d+)\)')
            matches = list(pattern_comment.finditer(comment_section))
            
            for i, match in enumerate(matches):
                h_no = match.group(1)
                start = match.end()
                end = matches[i+1].start() if i + 1 < len(matches) else len(comment_section)
                horse_comments.append({'horse_no': h_no, 'text': comment_section[start:end].strip()})

            base_row = {
                'location': current_location,
                'race_no': current_race_no,
                'pick_1': picks[0] if len(picks)>0 else '', 'pick_2': picks[1] if len(picks)>1 else '',
                'pick_3': picks[2] if len(picks)>2 else '', 'pick_4': picks[3] if len(picks)>3 else '',
                'upset_1': upsets[0] if len(upsets)>0 else '', 'upset_2': upsets[1] if len(upsets)>1 else '',
                # 선행마 컬럼 추가 (최대 6두까지 저장 가능하도록 설정)
                'front_1': fronts[0] if len(fronts)>0 else '', 'front_2': fronts[1] if len(fronts)>1 else '',
                'front_3': fronts[2] if len(fronts)>2 else '', 'front_4': fronts[3] if len(fronts)>3 else '',
                'front_5': fronts[4] if len(fronts)>4 else '', 'front_6': fronts[5] if len(fronts)>5 else '',
                'comment_horse_no': '', 'comment_text': ''
            }

            if not horse_comments:
                data_rows.append(base_row)
            else:
                for i, c in enumerate(horse_comments):
                    row = base_row.copy()
                    row['comment_horse_no'] = c['horse_no']
                    row['comment_text'] = c['text']
                    # 첫 번째 행에만 추천/복병/선행 정보를 남기고 나머지는 비움 (중복 방지)
                    if i > 0:
                        for k in ['pick_1', 'pick_2', 'pick_3', 'pick_4', 'upset_1', 'upset_2', 
                                  'front_1', 'front_2', 'front_3', 'front_4', 'front_5', 'front_6']:
                            row[k] = ''
                    data_rows.append(row)

        df = pd.DataFrame(data_rows)
        # 컬럼 순서 정리
        cols = ['location', 'race_no', 
                'pick_1', 'pick_2', 'pick_3', 'pick_4', 
                'upset_1', 'upset_2', 
                'front_1', 'front_2', 'front_3', 'front_4', 'front_5', 'front_6',
                'comment_horse_no', 'comment_text']
        
        if not df.empty: 
            # 데이터프레임에 없는 컬럼이 있으면 추가 (안전장치)
            for c in cols:
                if c not in df.columns: df[c] = ''
            df = df[cols]
        else: 
            df = pd.DataFrame(columns=cols)
        
        df.to_csv(output_path, index=False, encoding='utf-8-sig')
        return True

    # ==========================================
    # 5. 최종 JSON 생성
    # ==========================================
    def generate_json(self, entry_file, history_file, stats_file, expert_file, output_file, target_date):
        print(f"[5/5] 최종 JSON 병합 중... ({output_file})")
        try:
            df_entry = pd.read_csv(entry_file, encoding='utf-8-sig').fillna('')
            df_history = pd.read_csv(history_file, encoding='utf-8-sig').fillna('')
            df_stats = pd.read_csv(stats_file, encoding='utf-8-sig').fillna('')
            df_expert = pd.read_csv(expert_file, encoding='utf-8-sig').fillna('')
        except Exception as e:
            print(f"Error reading intermediate CSVs: {e}")
            return

        final_json = {
            "date": target_date,
            "locations": {
                "seoul": {"location_name": "서울", "races": []},
                "busan": {"location_name": "부산", "races": []},
                "jeju": {"location_name": "제주", "races": []}
            }
        }

        target_location_key = 'busan' if '부산' in output_file or 'Busan' in output_file else 'seoul'
        loc_map = {'seoul': '서울', 'busan': '부산', 'jeju': '제주'}
        target_loc_name = loc_map.get(target_location_key, '서울')
        
        race_numbers = sorted(df_entry['race_no'].unique())
        races_list = []

        def parse_weight(val):
            s = str(val).strip()
            if not s: return 0.0, ""
            match = re.search(r"(\d+(\.\d+)?)", s)
            if match:
                num_str = match.group(1)
                try:
                    num_val = float(num_str)
                    sign = s.replace(num_str, "").strip()
                    return num_val, sign
                except: pass
            return 0.0, s

        for race_no in race_numbers:
            try:
                race_no = int(race_no)
                entries = df_entry[df_entry['race_no'] == race_no]
                if entries.empty: continue
                
                first = entries.iloc[0]
                
                r_dist = str(first.get('distance', '')).strip()
                r_class = str(first.get('class', '')).strip() or str(first.get('grade', '')).strip()
                r_time = str(first.get('start_time', '')).strip()
                r_cond = str(first.get('conditions', '')).strip()

                if r_class and r_class in r_cond: r_cond = r_cond.replace(r_class, "").strip()
                if r_dist: 
                    r_cond = r_cond.replace(f"{r_dist}M", "").strip()
                    r_cond = r_cond.replace(r_dist, "").strip()

                race_info = {"class": r_class, "distance": r_dist, "start_time": r_time, "conditions": r_cond}

                expert_rows = df_expert[(df_expert['race_no'] == race_no) & (df_expert['location'] == target_loc_name)]
                expert_data = {"picks": [], "upset_picks": [], "front_runners": [], "picks_text": []}
                
                if not expert_rows.empty:
                    r1 = expert_rows.iloc[0]
                    picks = [r1[f'pick_{i}'] for i in range(1,5) if str(r1.get(f'pick_{i}', ''))!='']
                    upsets = [r1[f'upset_{i}'] for i in range(1,3) if str(r1.get(f'upset_{i}', ''))!='']
                    # 선행마 JSON 데이터 추가
                    fronts = [r1[f'front_{i}'] for i in range(1,7) if str(r1.get(f'front_{i}', ''))!='']

                    expert_data["picks"] = [int(float(p)) if str(p).replace('.','').isdigit() else p for p in picks]
                    expert_data["upset_picks"] = [int(float(u)) if str(u).replace('.','').isdigit() else u for u in upsets]
                    expert_data["front_runners"] = [int(float(f)) if str(f).replace('.','').isdigit() else f for f in fronts]

                    for _, row in expert_rows.iterrows():
                        if row['comment_horse_no']:
                            h_num_str = str(row['comment_horse_no']).split('.')[0]
                            expert_data["picks_text"].append({
                                "no": h_num_str,
                                "coment": row['comment_text']
                            })

                stats_rows = df_stats[(df_stats['race_no'] == race_no) & (df_stats['location'] == target_loc_name)]
                stats_data = {
                    "avg_record": "", "fast_start_horses": [], "fast_finish_horses": [],
                    "prize_money_6mon": [], "horse_bok_win": [],
                    "dist_win_rate_horses": [], "speed_index_horses": [], "best_record_horses": []
                }
                avg_rec = stats_rows[stats_rows['type'] == 'avg_record']
                if not avg_rec.empty: stats_data["avg_record"] = avg_rec.iloc[0]['value']
                
                def get_stats(stype, vkey):
                    res = []
                    for _, r in stats_rows[stats_rows['type'] == stype].iterrows():
                        h = int(float(r['horse_no'])) if str(r['horse_no']).replace('.','').isdigit() else 0
                        res.append({"no": h, "name": r['horse_name'], vkey: r['value']})
                    return res
                
                stats_data["fast_start_horses"] = get_stats('fast_start', 'rec')
                stats_data["fast_finish_horses"] = get_stats('fast_finish', 'rec')
                stats_data["prize_money_6mon"] = get_stats('prize_money', 'won')
                stats_data["horse_bok_win"] = get_stats('bok_win', 'bok_win')
                stats_data["dist_win_rate_horses"] = get_stats('dist_win', 'win_rate')
                stats_data["speed_index_horses"] = get_stats('speed_index', 'idx')
                stats_data["best_record_horses"] = get_stats('best_record', 'rec')

                horses_list = []
                for _, entry in entries.iterrows():
                    h_no = int(entry['horse_no'])
                    h_rows = df_history[(df_history['race_no'] == race_no) & (df_history['horse_no'] == h_no)]
                    
                    recent_hist = []
                    for _, hr in h_rows.iterrows():
                        hw, hs = parse_weight(hr.get('weight', ''))
                        recent_hist.append({
                            "date": hr['date'], "class": hr['class'], "distance": hr['distance'],
                            "record": hr['record'], 
                            "result_rank": int(float(hr['result_rank'])) if str(hr['result_rank']).replace('.','').isdigit() else hr['result_rank'],
                            "weight": hw, "weight_sign": hs,
                            "jockey": hr['jockey'], "s1f": str(hr['s1f']), "g3f": str(hr['g3f']), "g1f": str(hr['g1f'])
                        })

                    ew, es = parse_weight(entry.get('weight', ''))
                    
                    horses_list.append({
                        "horse_no": h_no, "name": entry['name'], "origin": entry['origin'],
                        "sex": entry['sex'], 
                        "age": int(float(entry['age'])) if str(entry['age']).replace('.','').isdigit() else 0,
                        "rating": str(entry['rating']), 
                        "training_cnt": int(float(entry['training_cnt'])) if str(entry['training_cnt']).replace('.','').isdigit() else 0,
                        "weight": ew, "weight_sign": es,
                        "jockey": entry['jockey'], "trainer": entry['trainer'], "owner": entry['owner'],
                        "grade": entry['grade'], "participation_period": entry['participation_period'],
                        "equipment": entry['equipment'], "sire": entry['sire'],
                        "recent_history": recent_hist
                    })

                races_list.append({
                    "race_no": race_no, "race_info": race_info,
                    "expert_opinion": expert_data, "stats_analysis": stats_data,
                    "horses": horses_list
                })
            except Exception as e:
                print(f"Error processing race {race_no}: {e}")
                continue

        final_json['locations'][target_location_key]['races'] = races_list

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(final_json, f, ensure_ascii=False, indent=2)
        print(f"JSON 변환 완료: {output_file}")


# ==========================================
# 실행 설정 (Configuration)
# ==========================================
if __name__ == "__main__":
    # ==========================================
    # 0. 초기 설정 (사용자 입력 받기)
    # ==========================================
    print("=== 경마 데이터 통합 파이프라인 ===")
    user_input = input("대상 날짜 또는 폴더명을 입력하세요 (예: 20260302, 서울0302, 부산0302): ").strip()
    
    if not user_input:
        print("입력값이 없습니다. 프로그램을 종료합니다.")
        import sys
        sys.exit()
        
    # 날짜 추출 (8자리 숫자 또는 뒤의 4자리 숫자)
    if re.match(r"^\d{8}$", user_input):
        TARGET_DATE_STR = user_input
    elif re.search(r"\d{4}$", user_input):
        mmdd = re.search(r"\d{4}$", user_input).group()
        # 입력된 MMDD가 현재 월보다 크면 작년, 작거나 같으면 올해 연도 사용 (단, 여기서는 2026년 프로젝트이므로 2026 고정 또는 유연하게 처리)
        # 사용자 데이터가 2026년에 집중되어 있으므로 2026을 기본으로 사용합니다.
        TARGET_DATE_STR = f"2026{mmdd}"
    else:
        print(f"올바르지 않은 입력 형식입니다: {user_input}")
        import sys
        sys.exit()

    TARGET_DATE_DASH = f"{TARGET_DATE_STR[:4]}-{TARGET_DATE_STR[4:6]}-{TARGET_DATE_STR[6:8]}"
    
    print(f"\n>>> 설정된 대상 날짜: {TARGET_DATE_STR} ({TARGET_DATE_DASH}) <<<")

    # 0.5. PDF 데이터 추출 (가장 먼저 실행)
    print("\n[단계 0] PDF 원천 데이터 추출 중...")
    run_pdf_parser(TARGET_DATE_STR)

    INTERMEDIATE_DIR = "data/1_intermediate"
    FINAL_DIR = "data/2_final"
    pipeline = RaceDataPipeline()

    # 처리할 지역 정의 (폴더명 키워드, JSON 파일명 접두어, 영문 키워드)
    REGIONS = [
        {"ko": "서울", "en": "Seoul", "key": "seoul"},
        {"ko": "부산", "en": "Busan", "key": "busan"}
    ]

    for reg in REGIONS:
        ko_name = reg["ko"]
        en_prefix = reg["en"]
        en_key = reg["key"]
        
        # 1. 원천 데이터 폴더 확인 (예: 서울0302)
        raw_folder = f"{ko_name}{TARGET_DATE_STR[-4:]}"
        if not os.path.exists(raw_folder):
            # 아카이브 폴더(이전에 통합 완료되어 이동된 폴더)에서 찾기
            archive_dir = os.path.join("archive", TARGET_DATE_STR[:4], "law", en_key)
            archive_path = os.path.join(archive_dir, raw_folder)
            if os.path.exists(archive_path):
                print(f"\n[정보] 아카이브 경로에서 {ko_name} 지역 데이터를 찾았습니다: {archive_path}")
                raw_folder = archive_path
            else:
                print(f"\n[스킵] {ko_name} 지역 폴더를 찾을 수 없습니다: {raw_folder} (아카이브: {archive_path})")
                continue

        print(f"\n>>> [{ko_name} 지역 처리 시작] <<<")

        # 2. 파일 경로 설정
        raw_entry = os.path.join(INTERMEDIATE_DIR, f"{TARGET_DATE_STR}_{ko_name}_통합_출전표.csv")
        raw_history = os.path.join(INTERMEDIATE_DIR, f"{TARGET_DATE_STR}_{ko_name}_경마_통합10회전적_상세.csv")
        raw_stats = os.path.join(INTERMEDIATE_DIR, f"{TARGET_DATE_STR}[{ko_name}]easyrace.txt")
        raw_expert = os.path.join(INTERMEDIATE_DIR, f"{en_prefix}ExpertPick.txt")
        
        # 중간 CSV 경로 (지역별 구분 없이 공유하지만, 순차 처리하므로 최종 JSON 생성 직전에만 유효하면 됨)
        csv_entry = os.path.join(INTERMEDIATE_DIR, 'EntrySheet.csv')
        csv_history = os.path.join(INTERMEDIATE_DIR, 'RecentHistory.csv')
        csv_stats = os.path.join(INTERMEDIATE_DIR, 'RaceStats.csv')
        csv_expert = os.path.join(INTERMEDIATE_DIR, 'ExpertPick.csv')
        
        output_json = os.path.join(FINAL_DIR, f'{en_prefix}_Race_Data_{TARGET_DATE_STR}.json')

        # 단계별 실행
        print(f"\n[단계 1] {ko_name} 개별 출전표 파일 통합...")
        integrate_entry_forms(target_folder=raw_folder, output_filename=raw_entry)

        print(f"\n[단계 2] {ko_name} 개별 최근10회전적 상세 통합...")
        # merge_ten_records는 내부에서 지역을 찾으므로 폴더를 넘겨줌
        merge_ten_records(target_folder=raw_folder, output_filename=raw_history)

        print(f"\n[단계 3] {ko_name} JSON 데이터 변환...")
        if os.path.exists(raw_entry):
            pipeline.convert_entry_sheet(raw_entry, csv_entry)
        if os.path.exists(raw_history):
            pipeline.convert_recent_history(raw_history, csv_history)
        if os.path.exists(raw_stats):
            pipeline.convert_race_stats(raw_stats, csv_stats)
        if os.path.exists(raw_expert):
            pipeline.convert_expert_pick(raw_expert, csv_expert)

        # 모든 필수 중간 파일이 준비되었는지 확인
        if all(os.path.exists(f) for f in [csv_entry, csv_history, csv_stats, csv_expert]):
            pipeline.generate_json(csv_entry, csv_history, csv_stats, csv_expert, output_json, TARGET_DATE_DASH)
            
            # 마지막 리포트 보완
            print(f"\n[단계 4] {ko_name} 심판리포트 및 진료현황 추가 통합...")
            integrate_judicial_medical(TARGET_DATE_STR, output_json)
            print(f"\n[성공] {ko_name} 지역 통합 완료: {output_json}")
        else:
            print(f"\n[오류] {ko_name} 필수 데이터 부족으로 JSON을 생성하지 못했습니다.")

    # 5. 서울/부산 파일이 모두 생성되었다면 통합 파일 생성
    print("[단계 5] 지역별 데이터 통합(Merge) 확인 중...")
    seoul_final = os.path.join(FINAL_DIR, f"Seoul_Race_Data_{TARGET_DATE_STR}.json")
    busan_final = os.path.join(FINAL_DIR, f"Busan_Race_Data_{TARGET_DATE_STR}.json")
    
    if os.path.exists(seoul_final) and os.path.exists(busan_final):
        print("서울/부산 데이터가 모두 존재합니다. 통합 파일을 생성합니다.")
        merge_regional_data(TARGET_DATE_STR)
    else:
        print("서울 또는 부산 데이터가 누락되어 통합 파일(Merged) 생성을 건너뜁니다.")

    print(f"\n=== {TARGET_DATE_STR} 모든 가용 지역의 통합 작업이 종료되었습니다 ===")

    # 6. 원본 데이터 폴더 아카이브 (이동)
    print("\n[단계 6] 원본 데이터 폴더 아카이브 중...")
    
    for reg in REGIONS:
        ko_name = reg["ko"]
        en_key = reg["key"]
        raw_folder = f"{ko_name}{TARGET_DATE_STR[-4:]}"
        
        if os.path.exists(raw_folder):
            # 대상 경로 수정: archive/YYYY/law/region
            archive_dir = os.path.join("archive", TARGET_DATE_STR[:4], "law", en_key)
            
            if not os.path.exists(archive_dir):
                os.makedirs(archive_dir)
                print(f"아카이브 경로 생성됨: {archive_dir}")
                
            target_path = os.path.join(archive_dir, raw_folder)
            try:
                # 이미 아카이브에 같은 폴더가 있으면 삭제 후 이동하거나 덮어쓰기 처리
                if os.path.exists(target_path):
                    shutil.rmtree(target_path)
                
                shutil.move(raw_folder, target_path)
                print(f"성공적으로 이동됨: {raw_folder} -> {target_path}")
            except Exception as e:
                print(f"폴더 이동 실패 ({raw_folder}): {e}")

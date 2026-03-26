import json
import os

def parse_racing_text(raw_text, position_type):
    """
    텍스트 데이터를 파싱하여 리스트 객체로 변환합니다.
    """
    results = []
    if not raw_text:
        return results
        
    lines = raw_text.strip().split('\n')
    
    for line in lines:
        if '---' in line or '기수명' in line or '조교사명' in line:
            continue
            
        parts = line.split()
        if not parts:
            continue

        try:
            if position_type == "기수":
                # 기수 데이터 구조 (총 15개 컬럼)
                item = {
                    "name": parts[0],
                    "group": parts[1],
                    "birthdate": parts[2],
                    "age": int(parts[3]),
                    "debut_date": parts[4],
                    "weight": int(parts[5]),
                    "riding_weight": int(parts[6]),
                    "total_stats": {
                        "starts": int(parts[7]),
                        "win_1st": int(parts[8]),
                        "win_2nd": int(parts[9]),
                        "win_3rd": int(parts[10])
                    },
                    "yearly_stats": {
                        "starts": int(parts[11]),
                        "win_1st": int(parts[12]),
                        "win_2nd": int(parts[13]),
                        "win_3rd": int(parts[14])
                    }
                }
            else:
                # 조교사 데이터 구조 (총 13개 컬럼)
                item = {
                    "name": parts[0],
                    "group": parts[1],
                    "birthdate": parts[2],
                    "age": int(parts[3]),
                    "debut_date": parts[4],
                    "total_stats": {
                        "starts": int(parts[5]),
                        "win_1st": int(parts[6]),
                        "win_2nd": int(parts[7]),
                        "win_3rd": int(parts[8])
                    },
                    "yearly_stats": {
                        "starts": int(parts[9]),
                        "win_1st": int(parts[10]),
                        "win_2nd": int(parts[11]),
                        "win_3rd": int(parts[12])
                    }
                }
            results.append(item)
        except (ValueError, IndexError) as e:
            print(f"데이터 파싱 에러: {line[:20]}... -> {e}")
            
    return results

def read_txt_file(file_path):
    """지정된 경로의 텍스트 파일을 읽어옵니다."""
    if not os.path.exists(file_path):
        print(f"경고: 파일을 찾을 수 없습니다 -> {file_path}")
        return ""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read()

def save_to_json(data, filename):
    """결과 데이터를 JSON 파일로 저장합니다."""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"파일 저장 완료: {filename}")

# --- 메인 실행 로직 ---
if __name__ == "__main__":
    UPDATE_DATE = "20260107"
    
    # 1. 파일 경로 설정 (이 파일들이 파이썬 파일과 같은 폴더에 있어야 합니다)
    file_paths = {
        "서울_기수": "seoul_jockey.txt",
        "서울_조교사": "seoul_trainer.txt",
        "부산_기수": "busan_jockey.txt",
        "부산_조교사": "busan_trainer.txt"
    }

    # 2. 최종 결과 구조 초기화
    racing_db = {
        "update_date": UPDATE_DATE,
        "regions": {
            "서울": {"positions": {"기수": [], "조교사": []}},
            "부산": {"positions": {"기수": [], "조교사": []}}
        }
    }

    # 3. 각 파일을 읽어서 파싱 진행
    # 서울 데이터 처리
    seoul_j_text = read_txt_file(file_paths["서울_기수"])
    racing_db["regions"]["서울"]["positions"]["기수"] = parse_racing_text(seoul_j_text, "기수")
    
    seoul_t_text = read_txt_file(file_paths["서울_조교사"])
    racing_db["regions"]["서울"]["positions"]["조교사"] = parse_racing_text(seoul_t_text, "조교사")

    # 부산 데이터 처리
    busan_j_text = read_txt_file(file_paths["부산_기수"])
    racing_db["regions"]["부산"]["positions"]["기수"] = parse_racing_text(busan_j_text, "기수")
    
    busan_t_text = read_txt_file(file_paths["부산_조교사"])
    racing_db["regions"]["부산"]["positions"]["조교사"] = parse_racing_text(busan_t_text, "조교사")

    # 4. JSON 파일 저장
    output_filename = f"JockeyTrainerStats{UPDATE_DATE}.json"
    save_to_json(racing_db, output_filename)
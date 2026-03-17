import os
import json
import glob

def integrate_data(date_str, json_path):
    print(f"\n[진료/심판리포트 통합] 시작: {date_str} -> {json_path}")
    
    # 1. 파일 경로 및 위치 식별
    if not os.path.exists(json_path):
        print(f"  오류: 대상 JSON 파일이 없습니다: {json_path}")
        return False
        
    filename = os.path.basename(json_path)
    if "Seoul" in filename or "서울" in filename:
        ko_name = "서울"
        en_key = "seoul"
    elif "Busan" in filename or "부산" in filename:
        ko_name = "부산"
        en_key = "busan"
    else:
        ko_name = "제주"
        en_key = "jeju"

    # 2. 크롤러 원본 데이터 폴더(아카이브) 찾기
    raw_folder = f"{ko_name}{date_str[-4:]}"
    archive_dir = os.path.join("archive", date_str[:4], "law", en_key)
    archive_path = os.path.join(archive_dir, raw_folder)
    
    # 루트에도 있을 수 있으니 확인
    if os.path.exists(raw_folder):
        source_dir = raw_folder
    elif os.path.exists(archive_path):
        source_dir = archive_path
    else:
        print(f"  스킵: 원본 데이터 폴더를 찾을 수 없습니다 ({raw_folder} 또는 {archive_path})")
        return False

    # 3. 크롤러의 *_total.json 파일 찾기 (하위 폴더 포함)
    pattern = os.path.join(source_dir, "**", "*_total.json")
    total_json_files = glob.glob(pattern, recursive=True)
    
    if not total_json_files:
        print(f"  스킵: 생성된 *_total.json 파일이 없습니다 ({source_dir})")
        return False
        
    try:
        # 5. 대상 JSON 로드
        with open(json_path, 'r', encoding='utf-8') as f:
            target_data = json.load(f)
            
        races = target_data.get("locations", {}).get(en_key, {}).get("races", [])
        
        medical_mapped_count = 0
        steward_mapped_count = 0

        # 여러 경주의 _total.json 파일을 순회하며 데이터 추출 및 병합
        for source_json_path in total_json_files:
            with open(source_json_path, 'r', encoding='utf-8') as f:
                source_data = json.load(f)
                
            medical_alerts = source_data.get("medical_alerts", [])
            steward_trip_notes = source_data.get("steward_trip_notes", [])
            
            if not medical_alerts and not steward_trip_notes:
                continue

            # 6. 데이터 머지 로직: 말 이름 기준으로 데이터 주입
            for race in races:
                horses = race.get("horses", [])
                for horse in horses:
                    horse_name = horse.get("name")
                    if not horse_name:
                        continue
                    
                    # 진료 현황 매핑
                    for ma in medical_alerts:
                        if ma.get("horse") == horse_name:
                            # 동일 날짜/내용 구조로 배열로 저장
                            # 중복 추가 방지
                            if "medical_alerts" not in horse:
                                horse["medical_alerts"] = [{"date": d, "detail": de} for d, de in zip(ma.get("dates", []), ma.get("details", []))]
                                medical_mapped_count += 1
                            break
                            
                    # 심판 리포트 매핑
                    for st in steward_trip_notes:
                        if st.get("horse") == horse_name:
                            if "steward_trip_note" not in horse:
                                horse["steward_trip_note"] = {"date": st.get("date"), "note": st.get("note")}
                                steward_mapped_count += 1
                            break

        # 7. 대상 JSON 저장
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(target_data, f, ensure_ascii=False, indent=2)

        print(f"  성공: 진료 데이터 {medical_mapped_count}건, 심판 리포트 데이터 {steward_mapped_count}건 병합 완료.")
        return True

    except Exception as e:
        print(f"  오류: 데이터 통합 중 문제가 발생했습니다: {e}")
        return False

import json
import os

def merge_race_files(date_str):
    """
    입력된 날짜 문자열을 바탕으로 서울/부산 파일을 찾아 하나의 JSON 파일로 통합합니다.
    파일명 형식: Seoul_Race_Data_YYYYMMDD.json, Busan_Race_Data_YYYYMMDD.json
    """
    base_dir = "data/2_final" if os.path.exists("data/2_final") else "."
    seoul_path = os.path.join(base_dir, f"Seoul_Race_Data_{date_str}.json")
    busan_path = os.path.join(base_dir, f"Busan_Race_Data_{date_str}.json")
    output_path = os.path.join(base_dir, f"Merged_Race_Data_{date_str}.json")

    try:
        # 1. 파일 존재 여부 확인
        if not os.path.exists(seoul_path):
            print(f"오류: 서울 데이터 파일이 없습니다. ({seoul_path})")
            return
        if not os.path.exists(busan_path):
            print(f"오류: 부산 데이터 파일이 없습니다. ({busan_path})")
            return

        # 2. 파일 로드
        with open(seoul_path, 'r', encoding='utf-8') as f:
            seoul_data = json.load(f)
        
        with open(busan_path, 'r', encoding='utf-8') as f:
            busan_data = json.load(f)

        # 3. 통합 데이터 구조 생성
        merged_data = {
            "date": seoul_data.get("date"),
            "locations": {
                "seoul": seoul_data["locations"].get("seoul", {"location_name": "서울", "races": []}),
                "busan": busan_data["locations"].get("busan", {"location_name": "부산", "races": []})
            }
        }

        # 데이터 보완 로직 (필요시)
        if not merged_data["locations"]["seoul"]["races"]:
            merged_data["locations"]["seoul"]["races"] = busan_data["locations"].get("seoul", {}).get("races", [])
        
        if not merged_data["locations"]["busan"]["races"]:
            merged_data["locations"]["busan"]["races"] = seoul_data["locations"].get("busan", {}).get("races", [])

        # 4. 결과 저장
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(merged_data, f, ensure_ascii=False, indent=2)
            
        print(f"\n[성공] {date_str} 데이터 통합 완료!")
        print(f"결과 파일: {output_path}")

    except Exception as e:
        print(f"오류 발생: {e}")

# 실행부
if __name__ == "__main__":
    print("=== 경마 데이터 자동 통합 도구 ===")
    target_date = input("통합할 날짜를 입력하세요 (예: 20260104): ").strip()
    
    if target_date:
        merge_race_files(target_date)
    else:
        print("날짜가 입력되지 않았습니다.")
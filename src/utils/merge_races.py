import json
import os

input_file = "Busan_Race_Data_20260109.json"
output_file = "Busan_Race_Data_20260109--.json" # 목표 파일명

# 파일이 존재하는지 확인
if not os.path.exists(input_file):
    print(f"오류: {input_file} 파일이 없습니다.")
else:
    # 1. 파일 읽기 (utf-8-sig를 사용하여 BOM 숨김 문자 자동 제거)
    with open(input_file, "r", encoding="utf-8-sig") as f:
        file_content = f.read().strip() # 앞뒤 공백 제거

    if not file_content:
        print("오류: 파일 내용이 비어 있습니다.")
    else:
        try:
            # 2. raw_decode를 사용하여 앞쪽의 유효한 JSON 덩어리(List)만 추출
            decoder = json.JSONDecoder()
            data, _ = decoder.raw_decode(file_content)
            print("데이터 로드 성공!")
            
            # 3. 데이터 구조 변환 (List -> Object)
            # 파일이 [ {정보}, {분석} ] 형태이므로, 첫 번째 요소({정보})만 가져옴
            if isinstance(data, list) and len(data) > 0:
                final_data = data[0]
                print("구조 변환 완료: 리스트의 첫 번째 항목만 추출했습니다.")
            else:
                final_data = data
                print("구조 변환 건너뜀: 이미 객체 형태이거나 리스트가 비어 있습니다.")

            # 4. 변환된 데이터를 목표 파일로 저장
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(final_data, f, indent=2, ensure_ascii=False)
            print(f"저장 완료: {output_file}")

        except json.JSONDecodeError as e:
            print(f"JSON 해석 오류 발생: {e}")
            print("파일 내용 앞부분:", file_content[:50]) # 디버깅용 출력
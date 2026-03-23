import glob
import os
import re
import pandas as pd

def search_training_detail_files(target_folder):
    """
    특정 폴더 내의 모든 조교상세 CSV 파일을 검색합니다.
    파일명 패턴: *조교상세_통합.csv 또는 *조교상세*.csv
    """
    search_pattern = os.path.join(target_folder, "**", "*조교상세*.csv")
    files = glob.glob(search_pattern, recursive=True)
    
    # 이미 통합된 파일이나 숨김 파일 등은 제외
    # 하지만 '조교상세_통합'이라는 이름이 개별 경주 파일에도 붙어있으므로 주의
    # 여기서는 디렉토리가 '경주'를 포함하는지 등을 체크하여 필터링
    filtered_results = []
    for f in files:
        basename = os.path.basename(f)
        if basename.startswith('.'): continue
        # 최종 통합 파일(data/1_intermediate에 저장될 파일)과 혼동되지 않도록 함
        if "날짜_" in basename and "_통합_조교상세.csv" in basename: continue # 이미 통합된 결과물 스킵
        filtered_results.append(f)
        
    # 파일명 기준 정렬 (경주 번호 순서)
    def get_race_number(filepath):
        filename = os.path.basename(filepath)
        match = re.search(r'(\d+)경주', filename)
        if match:
            return int(match.group(1))
        # 폴더명에서도 찾아봄
        dir_match = re.search(r'(\d+)경주', os.path.dirname(filepath))
        if dir_match:
            return int(dir_match.group(1))
        return 999
    
    filtered_results.sort(key=lambda x: (get_race_number(x), x))
    return filtered_results

def integrate_training_details(target_folder=".", output_filename="통합_조교상세.csv"):
    """
    특정 폴더 내의 모든 조교상세 파일을 검색하여 하나로 통합합니다.
    """
    print(f"조교상세 폴더 검색 시작: {target_folder}")
    
    files = search_training_detail_files(target_folder)
    
    if not files:
        print(f"'{target_folder}'에서 조교상세 CSV 파일을 찾을 수 없습니다.")
        return
    
    print(f"총 {len(files)}개의 조교상세 파일을 발견했습니다.\n")
    
    all_dfs = []
    
    for filepath in files:
        filename = os.path.basename(filepath)
        print(f"처리 중: {filename}...")
        try:
            # 인코딩 처리
            df = None
            for enc in ['utf-8-sig', 'cp949', 'utf-8']:
                try:
                    df = pd.read_csv(filepath, encoding=enc)
                    break
                except UnicodeDecodeError:
                    continue
            
            if df is not None and not df.empty:
                # 출처 경주 정보 추가 (파일명이나 폴더명에서 추출)
                race_match = re.search(r'(\d+)경주', filename) or re.search(r'(\d+)경주', os.path.dirname(filepath))
                if race_match:
                    df['경주번호'] = int(race_match.group(1))
                else:
                    df['경주번호'] = 0
                
                all_dfs.append(df)
        except Exception as e:
            print(f"파일 처리 중 오류 발생 ({filename}): {e}")
            
    if not all_dfs:
        print("\n합칠 데이터가 없습니다.")
        return
    
    # 데이터 통합
    integrated_df = pd.concat(all_dfs, ignore_index=True)
    
    # 컬럼 순서 조정 (필요한 컬럼 위주)
    # 마번, 마명, 조교일자, 기승자, 조교시간, 걸음걸이, 수영조교
    cols = list(integrated_df.columns)
    priority_cols = ['경주번호', '마번', '마명', '조교일자', '기승자', '조교시간', '걸음걸이', '수영조교']
    sorted_cols = [c for c in priority_cols if c in cols] + [c for c in cols if c not in priority_cols]
    integrated_df = integrated_df[sorted_cols]
    
    # 날짜와 마번 기준으로 정렬
    if '경주번호' in integrated_df.columns and '마번' in integrated_df.columns:
        integrated_df = integrated_df.sort_values(by=['경주번호', '마번', '조교일자'], ascending=[True, True, False])

    try:
        integrated_df.to_csv(output_filename, index=False, encoding='utf-8-sig')
        print(f"\n성공적으로 저장되었습니다: {output_filename}")
        print(f"총 데이터 행 수: {len(integrated_df)}")
    except Exception as e:
        print(f"\n파일 저장 실패: {e}")

if __name__ == "__main__":
    user_input = input("검색할 폴더 경로를 입력하세요: ").strip()
    target_path = user_input if user_input else "."
    integrate_training_details(target_folder=target_path)

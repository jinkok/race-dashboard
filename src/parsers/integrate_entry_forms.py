import glob
import os
import re


def search_entry_form_files(target_folder):
    """
    특정 폴더 내의 모든 출전표 CSV 파일을 재귀적으로 검색합니다.
    
    Args:
        target_folder: 검색할 폴더 경로
        
    Returns:
        검색된 파일 경로 리스트
    """
    search_pattern = os.path.join(target_folder, "**", "*출전표*.csv")
    files = glob.glob(search_pattern, recursive=True)
    
    # 통합 파일이나 숨김 파일 등은 제외
    files = [f for f in files if "통합" not in os.path.basename(f) and not os.path.basename(f).startswith('.')]
    
    # 파일명 기준 정렬 (경주 번호 순서)
    def get_race_number(filepath):
        filename = os.path.basename(filepath)
        match = re.search(r'(\d+)경주', filename)
        if match:
            return int(match.group(1))
        return 999
    
    files.sort(key=lambda x: get_race_number(x))
    
    return files


def process_entry_form_file(filepath):
    """
    각 출전표 CSV 파일을 텍스트로 읽어서 전체 내용을 반환합니다.
    헤더(경주 정보)와 출전표 데이터를 모두 포함합니다.
    출처파일 컬럼이 있다면 제거합니다.
    
    Args:
        filepath: 처리할 파일 경로
        
    Returns:
        파일 내용 문자열 (None if error)
    """
    filename = os.path.basename(filepath)
    print(f"처리 중: {filename}...")
    
    try:
        # 인코딩 처리: utf-8 시도 후 실패 시 cp949 시도
        lines = []
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                lines = f.readlines()
        except UnicodeDecodeError:
            try:
                with open(filepath, 'r', encoding='cp949') as f:
                    lines = f.readlines()
            except UnicodeDecodeError:
                print(f"인코딩 에러로 파일을 읽을 수 없습니다: {filename}")
                return None
        
        if not lines or len(lines) == 0:
            print(f"스킵: 빈 파일입니다 ({filename})")
            return None
        
        # 출처파일 컬럼 제거 처리
        # 헤더 라인 찾기 (번호, 마명 등이 포함된 라인)
        header_idx = -1
        for i, line in enumerate(lines):
            if ',' in line and ('번호' in line or '마명' in line):
                header_idx = i
                break
        
        if header_idx >= 0:
            # 헤더에서 출처파일 컬럼 제거
            header_line = lines[header_idx].rstrip('\n\r')
            header_cols = header_line.split(',')
            
            # 출처파일 컬럼 인덱스 찾기
            source_file_idx = -1
            for idx, col in enumerate(header_cols):
                if '출처' in col or '파일' in col:
                    source_file_idx = idx
                    break
            
            # 출처파일 컬럼이 있으면 제거
            if source_file_idx >= 0:
                # 헤더에서 제거
                header_cols.pop(source_file_idx)
                lines[header_idx] = ','.join(header_cols) + '\n'
                
                # 데이터 라인에서도 제거
                for i in range(header_idx + 1, len(lines)):
                    if ',' in lines[i]:
                        data_cols = lines[i].rstrip('\n\r').split(',')
                        if len(data_cols) > source_file_idx:
                            data_cols.pop(source_file_idx)
                            lines[i] = ','.join(data_cols) + '\n'
        
        return ''.join(lines)
        
    except Exception as e:
        print(f"파일 처리 중 오류 발생 ({filename}): {e}")
        return None


def integrate_entry_forms(target_folder=".", output_filename="통합_출전표.csv"):
    """
    특정 폴더 내의 모든 출전표 파일을 검색하여 통합합니다.
    각 파일의 헤더(경주 정보)와 출전표 데이터를 그대로 이어 붙입니다.
    
    Args:
        target_folder: 검색할 폴더 경로 (기본값: 현재 폴더)
        output_filename: 출력 파일명 (기본값: 통합_출전표.csv)
    """
    print(f"폴더 검색 시작: {target_folder}")
    
    # 1. 파일 검색
    files = search_entry_form_files(target_folder)
    
    if not files:
        print(f"'{target_folder}' 및 하위 폴더에서 출전표 CSV 파일을 찾을 수 없습니다.")
        return
    
    print(f"총 {len(files)}개의 출전표 파일을 발견했습니다.\n")
    
    # 파일명에서 날짜와 경마장 이름 추출 (첫 번째 파일 기준)
    date_prefix = ""
    track_name = ""
    if files:
        first_file_name = os.path.basename(files[0])
        # 날짜 추출 (YYYYMMDD 형식)
        date_match = re.search(r'(\d{8})', first_file_name)
        if date_match:
            date_prefix = date_match.group(1) + "_"
        
        # 경마장 이름 추출 (서울, 부산, 제주 등)
        track_match = re.search(r'_(서울|부산|제주)_', first_file_name)
        if track_match:
            track_name = track_match.group(1) + "_"
    
    # 출력 파일명에 날짜와 경마장 이름 포함
    if date_prefix and output_filename == "통합_출전표.csv":
        if track_name:
            output_filename = f"{date_prefix}{track_name}통합_출전표.csv"
        else:
            output_filename = f"{date_prefix}통합_출전표.csv"
    
    # 2. 파일 처리 및 통합
    all_contents = []
    
    for filepath in files:
        content = process_entry_form_file(filepath)
        if content:
            all_contents.append(content)
            # 각 파일 사이에 빈 줄 추가 (가독성을 위해)
            all_contents.append("\n")
    
    if not all_contents:
        print("\n처리할 수 있는 파일이 없습니다.")
        return
    
    # 마지막 빈 줄 제거
    if all_contents and all_contents[-1] == "\n":
        all_contents.pop()
    
    # 3. 통합된 내용을 파일로 저장
    integrated_content = "".join(all_contents)
    
    try:
        with open(output_filename, 'w', encoding='utf-8-sig') as f:
            f.write(integrated_content)
        
        print(f"\n성공적으로 저장되었습니다: {output_filename}")
        print(f"통합된 파일 수: {len([c for c in all_contents if c != "\n"])}")
        
    except Exception as e:
        print(f"\n파일 저장 실패: {e} (파일이 열려있다면 닫아주세요)")


if __name__ == "__main__":
    # 사용자로부터 폴더 경로 입력 받기
    user_input = input("검색할 폴더 경로를 입력하세요 (엔터키를 치면 현재 폴더 검색): ").strip()
    
    if not user_input:
        target_path = "."
    else:
        target_path = user_input
    
    integrate_entry_forms(target_folder=target_path)


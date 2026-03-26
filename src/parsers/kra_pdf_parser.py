import os
import re
import json
import pdfplumber
import glob

def extract_date_from_filename(filename):
    """Extracts YYMMDD date from filename (e.g., b_tr_run_260327.pdf)"""
    m = re.search(r'(\d{6})', filename)
    return m.group(1) if m else None

def parse_entry_status_pdf(pdf_path, is_trainer=True):
    """
    Parses entry/riding status PDF (tr_run or jk_run).
    Returns a dict mapping name to entry count for that date.
    """
    data = {}
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if not text: continue
                lines = text.split('\n')
                for i, line in enumerate(lines):
                    if is_trainer:
                        # Trainer style: "Name [Horses...]"
                        match = re.search(r'^([가-힣]{2,4})\s+([①-⑫]|[\d]+)', line)
                        if match:
                            name = match.group(1)
                            entries = re.findall(r'[①-⑫][가-힣\s]+', line)
                            data[name] = data.get(name, 0) + len(entries)
                    else:
                        # Jockey style: 
                        # Line i-1: [Horses...]
                        # Line i  : "Name Count"
                        match = re.search(r'^([가-힣]{2,4})\s+(\d+)$', line)
                        if match:
                            name = match.group(1)
                            count = int(match.group(2))
                            data[name] = data.get(name, 0) + count
    except Exception as e:
        print(f"Error parsing {pdf_path}: {e}")
    return data

def parse_performance_status_pdf(pdf_path, is_trainer=True):
    """
    Parses performance status PDF (prize).
    Returns a dict mapping name to stats dict.
    """
    data = {}
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if not text: continue
                lines = text.split('\n')
                
                for i, line in enumerate(lines):
                    if is_trainer:
                        # Trainer style: "백광열 8,680(1,086/990) 41(7/3/6) ..."
                        trainer_pattern = re.compile(r'([가-힣]{2,4})\s+([\d,]+)\(([\d,]+)/([\d,]+)\)')
                        matches = list(trainer_pattern.finditer(line))
                        
                        for m_idx, m in enumerate(matches):
                            name = m.group(1)
                            total_runs = int(m.group(2).replace(',', ''))
                            wins = int(m.group(3).replace(',', ''))
                            seconds = int(m.group(4).replace(',', ''))
                            
                            stats = {
                                "career": {
                                    "total_runs": total_runs,
                                    "wins": wins,
                                    "seconds": seconds,
                                    "win_rate": round(wins/total_runs*100, 1) if total_runs > 0 else 0
                                },
                                "recent_stats": {}
                            }
                            
                            # Find monthly stats following this trainer but before the next trainer
                            start_pos = m.end()
                            end_pos = matches[m_idx+1].start() if m_idx + 1 < len(matches) else len(line)
                            sub_text = line[start_pos:end_pos]
                            
                            monthly_matches = re.findall(r'(\d+)\((\d+)/(\d+)/(\d+)\)', sub_text)
                            if monthly_matches:
                                m_last = monthly_matches[-1] # Usually the most recent or current month
                                stats["recent_stats"] = {
                                    "period": "1개월전",
                                    "runs": int(m_last[0]),
                                    "wins": int(m_last[1]),
                                    "seconds": int(m_last[2]),
                                    "thirds": int(m_last[3]),
                                    "win_rate": round(int(m_last[1])/int(m_last[0])*100, 1) if int(m_last[0]) > 0 else 0
                                }
                            data[name] = stats
                    else:
                        # Jockey style:
                        # Line i: "권오찬 849전(①32②51③56) 0전(①0②0③0)"
                        jockey_pattern = re.compile(r'([가-힣]{2,4})\s+([\d,]+)전\(①([\d,]+)②([\d,]+)③([\d,]+)\)')
                        matches = list(jockey_pattern.finditer(line))
                        
                        for m_idx, m in enumerate(matches):
                            name = m.group(1)
                            total_runs = int(m.group(2).replace(',', ''))
                            wins = int(m.group(3).replace(',', ''))
                            seconds = int(m.group(4).replace(',', ''))
                            thirds = int(m.group(5).replace(',', ''))
                            
                            stats = {
                                "career": {
                                    "total_runs": total_runs,
                                    "wins": wins,
                                    "seconds": seconds,
                                    "thirds": thirds,
                                    "win_rate": round(wins/total_runs*100, 1) if total_runs > 0 else 0
                                },
                                "recent_stats": {}
                            }
                            
                            # For jockeys, recent stats are often right after the career stats on the same line: "0전(①0②0③0)"
                            start_pos = m.end()
                            end_pos = matches[m_idx+1].start() if m_idx + 1 < len(matches) else len(line)
                            sub_text = line[start_pos:end_pos]
                            
                            recent_match = re.search(r'(\d+)전\(①(\d+)②(\d+)③(\d+)\)', sub_text)
                            if recent_match:
                                r_runs = int(recent_match.group(1))
                                stats["recent_stats"] = {
                                    "period": "1개월전",
                                    "runs": r_runs,
                                    "wins": int(recent_match.group(2)),
                                    "seconds": int(recent_match.group(3)),
                                    "thirds": int(recent_match.group(4)),
                                    "win_rate": round(int(recent_match.group(2))/r_runs*100, 1) if r_runs > 0 else 0
                                }
                            data[name] = stats
    except Exception as e:
        print(f"Error parsing {pdf_path}: {e}")
    return data

def run_parser(target_date_str):
    """
    Main parser execution function.
    target_date_str: YYMMDD format.
    """
    raw_dir = "data/0_raw"
    intermediate_dir = "data/1_intermediate"
    os.makedirs(intermediate_dir, exist_ok=True)
    
    # We want to aggregate entry counts for the whole week/weekend
    # Let's find all relevant PDFs for this week (roughly)
    # For now, we'll find all in the directory.
    all_pdfs = glob.glob(os.path.join(raw_dir, "*.pdf"))
    
    trainer_stats = {}
    jockey_stats = {}
    
    # 1. Parse Entry Status PDFs
    for pdf in all_pdfs:
        basename = os.path.basename(pdf)
        date = extract_date_from_filename(basename)
        if not date: continue
        
        # Check if it's a regional trainer or jockey entry file
        if "_tr_run_" in basename and "_prize_" not in basename:
            counts = parse_entry_status_pdf(pdf, is_trainer=True)
            for name, cnt in counts.items():
                if name not in trainer_stats: trainer_stats[name] = {"today_entries": {"total": 0}}
                trainer_stats[name]["today_entries"][date] = cnt
                trainer_stats[name]["today_entries"]["total"] += cnt
                
        elif "_jk_run_" in basename and "_prize_" not in basename:
            counts = parse_entry_status_pdf(pdf, is_trainer=False)
            for name, cnt in counts.items():
                if name not in jockey_stats: jockey_stats[name] = {"today_rides": {"total": 0}}
                jockey_stats[name]["today_rides"][date] = cnt
                jockey_stats[name]["today_rides"]["total"] += cnt

    # 2. Parse Performance Status PDFs (Prize)
    # We use the most recent one for career/recent stats
    prize_pdfs = sorted([f for f in all_pdfs if "_prize_" in f], reverse=True)
    
    parsed_trainers = {}
    parsed_jockeys = {}
    
    for pdf in prize_pdfs:
        basename = os.path.basename(pdf)
        if "_tr_run_prize_" in basename:
            perf = parse_performance_status_pdf(pdf, is_trainer=True)
            for name, stats in perf.items():
                if name not in parsed_trainers: parsed_trainers[name] = stats
        elif "_jk_run_prize_" in basename:
            perf = parse_performance_status_pdf(pdf, is_trainer=False)
            for name, stats in perf.items():
                if name not in parsed_jockeys: parsed_jockeys[name] = stats

    # 3. Merge data and check for missing stats
    missing_trainers = []
    for name in trainer_stats.keys():
        if name in parsed_trainers:
            trainer_stats[name].update(parsed_trainers[name])
        else:
            missing_trainers.append(name)
            
    missing_jockeys = []
    for name in jockey_stats.keys():
        if name in parsed_jockeys:
            jockey_stats[name].update(parsed_jockeys[name])
        else:
            missing_jockeys.append(name)

    # Report missing stats
    if missing_trainers:
        print(f"\n[경고] 다음 조교사의 성적 정보를 PDF에서 추출하지 못했습니다 (성적표 확인 필요):")
        print(f"  - {', '.join(sorted(missing_trainers))}")
    
    if missing_jockeys:
        print(f"\n[경고] 다음 기수의 성적 정보를 PDF에서 추출하지 못했습니다 (성적표 확인 필요):")
        print(f"  - {', '.join(sorted(missing_jockeys))}")

    # 4. Save to JSON
    trainer_json_path = os.path.join(intermediate_dir, f"trainer_stats_{target_date_str}.json")
    jockey_json_path = os.path.join(intermediate_dir, f"jockey_stats_{target_date_str}.json")
    
    with open(trainer_json_path, 'w', encoding='utf-8') as f:
        json.dump(trainer_stats, f, ensure_ascii=False, indent=2)
    with open(jockey_json_path, 'w', encoding='utf-8') as f:
        json.dump(jockey_stats, f, ensure_ascii=False, indent=2)
        
    print(f"Saved: {trainer_json_path}")
    print(f"Saved: {jockey_json_path}")

if __name__ == "__main__":
    import sys
    date_arg = sys.argv[1] if len(sys.argv) > 1 else "260327"
    run_parser(date_arg)

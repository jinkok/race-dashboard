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
                        career_match = re.search(r'([가-힣]{2,4})\s+(\d+,?\d+)\((\d+,?\d+)/(\d+,?\d+)\)', line)
                        if career_match:
                            name = career_match.group(1)
                            total_runs = int(career_match.group(2).replace(',', ''))
                            wins = int(career_match.group(3).replace(',', ''))
                            seconds = int(career_match.group(4).replace(',', ''))
                            
                            stats = {
                                "career": {
                                    "total_runs": total_runs,
                                    "wins": wins,
                                    "seconds": seconds,
                                    "win_rate": round(wins/total_runs*100, 1) if total_runs > 0 else 0
                                },
                                "recent_stats": {}
                            }
                            
                            monthly_matches = re.findall(r'(\d+)\((\d+)/(\d+)/(\d+)\)', line)
                            if monthly_matches:
                                m_last = monthly_matches[-1]
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
                        # Line i+1: "(2021년) (3.8%/9.8%/16.4%) (0.0% / 0.0% / 0백만원)"
                        career_match = re.search(r'([가-힣]{2,4})\s+(\d+,?\d+)전\(①(\d+,?\d+)②(\d+,?\d+)③(\d+,?\d+)\)', line)
                        if career_match:
                            name = career_match.group(1)
                            total_runs = int(career_match.group(2).replace(',', ''))
                            wins = int(career_match.group(3).replace(',', ''))
                            seconds = int(career_match.group(4).replace(',', ''))
                            thirds = int(career_match.group(5).replace(',', ''))
                            
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
                            
                            # Recent stats on the same line: "0전(①0②0③0)"
                            recent_match = re.search(r'(\d+)전\(①(\d+)②(\d+)③(\d+)\)$', line)
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

    # 3. Merge data
    for name, stats in parsed_trainers.items():
        if name in trainer_stats:
            trainer_stats[name].update(stats)
        else:
            trainer_stats[name] = stats
            
    for name, stats in parsed_jockeys.items():
        if name in jockey_stats:
            jockey_stats[name].update(stats)
        else:
            jockey_stats[name] = stats

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

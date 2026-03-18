const { useState, useEffect, useRef } = React;

const Icon = ({ name, size = 16, className = "" }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (window.lucide) window.lucide.createIcons({ root: ref.current, name, attrs: { width: size, height: size, class: className } });
    }, [name, className, size]);
    return <i ref={ref} data-lucide={name}></i>;
};

const EQUIPMENT_INFO = {
    "눈가면": "시야의 좌우를 차단해 앞만 보고 달리게 하여 집중력을 높임 (산만하거나 딴짓을 하는 말에게 효과적)",
    "망사눈": "시야 차단(눈가면)과 소음 차단(망사) 기능을 동시에 수행 (극도로 예민하거나 산만한 말의 집중력 강화)",
    "망사": "귀를 덮어 주변의 소음을 차단하여 말을 진정시킴 (소리에 민감해 흥분하기 쉬운 말의 안정 유도)",
    "반가지큰": "눈가면과 비슷하나 가리개에 구멍이 있어 후방 시야를 일부 확보 (완전히 가렸을 때 답답해하는 말의 시야 조절)",
    "계란형큰": "뺨 부착형 시야 가리개로 눈가면보다 약한 시야 제한 효과 (가벼운 집중력 개선이 필요할 때 사용)",
    "혀끈": "혀를 아래로 고정하여 재갈 위로 넘어가는 것을 방지 (기수의 제어력 향상 및 원활한 호흡 도움)",
    "트라이아비트": "혀와 입술에 가해지는 압박을 줄여주는 특수 재갈 (입이 예민한 말의 거부감을 줄여 조종성 향상)",
    "Triabit": "혀와 입술에 가해지는 압박을 줄여주는 특수 재갈 (입이 예민한 말의 거부감을 줄여 조종성 향상)",
    "양털코": "코굴레에 양털을 덧대어 말의 시선을 아래로 유도 (머리를 높게 드는 말을 진정시키고 하방 주시 유도)",
    "자극판": "뺨 안쪽 등에 자극을 주어 한쪽으로 기대는 습관을 교정 (주행 불량(사행 등)을 방지하기 위한 보조 장구)",
    "편자": "경주 시 바닥 접지력과 발 보호를 위해 승인된 특수 편자 (주로의 상태나 말의 발 상태에 맞춰 착용)",
    "승인편자": "경주 시 바닥 접지력과 발 보호를 위해 승인된 특수 편자 (주로의 상태나 말의 발 상태에 맞춰 착용)"
};

const getBadgeStyle = (no) => {
    const n = parseInt(no);
    const base = "border-2 shadow-sm box-border";
    if (n === 1) return `${base} bg-white text-slate-900 border-slate-900`;
    if (n === 2) return `${base} bg-yellow-400 text-slate-900 border-yellow-400`;
    if (n === 3) return `${base} bg-red-600 text-white border-red-600`;
    if (n === 4) return `${base} bg-slate-900 text-white border-slate-900`;
    if (n === 5) return `${base} bg-blue-600 text-white border-blue-600`;
    if (n === 6) return `${base} bg-green-600 text-white border-green-600`;
    if (n === 7) return `${base} bg-[#8B4513] text-white border-[#8B4513]`;
    if (n === 8) return `${base} bg-pink-400 text-white border-pink-400`;
    if (n === 9) return `${base} bg-purple-700 text-white border-purple-700`;
    if (n === 10) return `${base} bg-[#2ad0e4] text-slate-900 border-[#2ad0e4]`;
    if (n === 11) return `${base} bg-white text-[#005c42] border-[#005c42]`;
    if (n === 12) return `${base} bg-yellow-400 text-[#005c42] border-[#005c42]`;
    return `${base} bg-slate-200 text-slate-500 border-slate-300`;
};

const BarChart = ({ data, color }) => {
    if (!data) return null;
    const parsedData = data.map(d => ({ ...d, val: parseFloat(d.rec) }));
    const min = Math.min(...parsedData.map(d => d.val));
    const max = Math.max(...parsedData.map(d => d.val));
    const range = max - min || 1;

    return (
        <div className="space-y-3">
            {parsedData.map((item, idx) => {
                const percentage = 100 - ((item.val - min) / range * 40);
                const isTop = idx === 0;
                return (
                    <div key={idx} className="flex items-center gap-3">
                        <div className="w-6 shrink-0 flex justify-center">
                            <span className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center ${getBadgeStyle(item.no)}`}>
                                {item.no}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-end justify-between mb-1">
                                <span className={`text-xs truncate ${isTop ? 'font-black text-slate-900' : 'font-medium text-slate-600'}`}>{item.name}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative">
                                <div className={`h-full rounded-full bar-fill ${color === 'red' ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${percentage}%` }}></div>
                            </div>
                        </div>
                        <div className={`w-12 text-right font-mono text-xs tabular font-bold ${isTop ? (color === 'red' ? 'text-red-600' : 'text-blue-600') : 'text-slate-500'}`}>
                            {item.rec}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const ValueChart = ({ data, color, valueKey }) => {
    if (!data) return null;
    const parsedData = data.map(d => {
        const rawVal = d[valueKey];
        const numVal = parseFloat(rawVal.replace(/[^0-9.]/g, '')) || 0;
        return { ...d, val: numVal, raw: rawVal };
    });
    const max = Math.max(...parsedData.map(d => d.val)) || 1;
    return (
        <div className="space-y-3">
            {parsedData.map((item, idx) => {
                const percentage = (item.val / max) * 100;
                const isTop = idx === 0;
                let barColorClass = 'bg-blue-500';
                if (color === 'green') barColorClass = 'bg-emerald-500';
                if (color === 'purple') barColorClass = 'bg-purple-500';
                return (
                    <div key={idx} className="flex items-center gap-3">
                        <div className="w-6 shrink-0 flex justify-center">
                            <span className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center ${getBadgeStyle(item.no)}`}>
                                {item.no}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-end justify-between mb-1">
                                <span className={`text-xs truncate ${isTop ? 'font-black text-slate-900' : 'font-medium text-slate-600'}`}>{item.name}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative">
                                <div className={`h-full rounded-full bar-fill ${barColorClass}`} style={{ width: `${percentage}%` }}></div>
                            </div>
                        </div>
                        <div className={`w-16 text-right font-mono text-xs tabular font-bold ${isTop ? 'text-slate-900' : 'text-slate-500'}`}>
                            {item.raw}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

function App() {
    const [user, setUser] = useState(null);
    const [viewMode, setViewMode] = useState('app');
    const [syncStatus, setSyncStatus] = useState('connecting');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loc, setLoc] = useState('seoul');
    const [raceIdx, setRaceIdx] = useState(0);
    const [expanded, setExpanded] = useState(null);
    const [subTab, setSubTab] = useState('records');
    const [horseNotes, setHorseNotes] = useState({});
    const [notesInput, setNotesInput] = useState({});
    const [hoveredEq, setHoveredEq] = useState(null);

    const defaultData = {
        date: "데이터 없음",
        locations: {
            seoul: { location_name: "서울", races: [] },
            busan: { location_name: "부산", races: [] }
        }
    };
    const [dbData, setDbData] = useState(defaultData);

    // 지역 변경 시 인덱스 초기화
    const changeLocation = (newLoc) => {
        setLoc(newLoc);
        setRaceIdx(0);
        setExpanded(null);
        setSubTab('records');
    };

    useEffect(() => {
        const interval = setInterval(() => {
            if (window.fb && window.fb.isReady) {
                clearInterval(interval);
                startSync();
            }
        }, 100);
        return () => clearInterval(interval);
    }, [date]);

    const startSync = async () => {
        const { auth, db, doc, onSnapshot, signInAnonymously, onAuthStateChanged } = window.fb;
        try {
            await signInAnonymously(auth);
            onAuthStateChanged(auth, (u) => {
                setUser(u);
                if (u) {
                    const docRef = doc(db, 'artifacts', 'race-app-3e41d', 'public', 'data', 'raceDataJson', date);
                    onSnapshot(docRef, (snap) => {
                        if (snap.exists()) {
                            setDbData(snap.data());
                            setSyncStatus('synced');
                        } else {
                            setDbData(defaultData);
                            setSyncStatus('no-data');
                        }
                    });

                    const notesRef = doc(db, 'artifacts', 'race-app-3e41d', 'public', 'horseNotesData');
                    onSnapshot(notesRef, (snap) => {
                        if (snap.exists()) {
                            setHorseNotes(snap.data());
                        }
                    });
                }
            });
        } catch (e) {
            setSyncStatus('error');
        }
    };

    const saveHorseNote = async (horseName, noteText) => {
        if (!user) return alert('로그인 중...');
        if (!noteText?.trim()) return alert('내용을 입력해주세요.');
        
        const { db, doc, setDoc } = window.fb;
        const notesRef = doc(db, 'artifacts', 'race-app-3e41d', 'public', 'horseNotesData');
        
        const newNote = {
            id: Date.now().toString(),
            date: date,
            content: noteText
        };
        
        const currentNotes = horseNotes[horseName] || [];
        const updatedNotes = [newNote, ...currentNotes]; // 최신순
        
        try {
            await setDoc(notesRef, { [horseName]: updatedNotes }, { merge: true });
            setNotesInput({ ...notesInput, [horseName]: '' }); // 입력창 초기화
            alert('저장되었습니다.');
        } catch (err) {
            alert('저장 오류: ' + err.message);
        }
    };

    const deleteHorseNoteItem = async (horseName, noteId) => {
        if (!user) return alert('로그인 중...');
        if (!confirm('이 메모를 삭제하시겠습니까?')) return;
        
        const { db, doc, setDoc } = window.fb;
        const notesRef = doc(db, 'artifacts', 'race-app-3e41d', 'public', 'horseNotesData');
        
        const currentNotes = horseNotes[horseName] || [];
        const updatedNotes = currentNotes.filter(n => n.id !== noteId);
        
        try {
            await setDoc(notesRef, { [horseName]: updatedNotes }, { merge: true });
            alert('삭제되었습니다.');
        } catch (err) {
            alert('삭제 오류: ' + err.message);
        }
    };

    const handleJsonUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const json = JSON.parse(ev.target.result);
                const dateMatch = json.date.match(/(\d{4}-\d{2}-\d{2})/);
                const targetDate = dateMatch ? dateMatch[1] : date;
                setDate(targetDate);
                setDbData(json);
                if (user) {
                    const { db, doc, setDoc } = window.fb;
                    const docRef = doc(db, 'artifacts', 'race-app-3e41d', 'public', 'data', 'raceDataJson', targetDate);
                    await setDoc(docRef, { ...json, lastUpdated: new Date().toISOString() });
                    setSyncStatus('synced');
                }
            } catch (err) { alert("오류: " + err.message); }
        };
        reader.readAsText(file);
    };

    const currentLocData = dbData.locations[loc] || { location_name: loc === 'seoul' ? "서울" : "부산", races: [] };
    const races = currentLocData.races || [];
    const race = races[raceIdx];
    const expert = race?.expert_opinion;
    const stats = race?.stats_analysis;
    const info = race?.race_info;

    const getNum = (str) => {
        if (!str) return 0;
        return parseFloat(String(str).split('(')[0].replace(/[^\d.-]/g, '')) || 0;
    };
    const getClassNum = (str) => {
        if (!str) return 99;
        const match = str.match(/\d+/);
        return match ? parseInt(match[0]) : 99;
    };

    // 시간 변환 함수
    const timeToSeconds = (timeStr) => {
        if (!timeStr || typeof timeStr !== 'string') return 9999;
        const parts = timeStr.split(':');
        if (parts.length === 2) return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
        return parseFloat(timeStr) || 9999;
    };

    const formatTime = (seconds) => {
        if (seconds >= 9999) return "-";
        const m = Math.floor(seconds / 60);
        const s = (seconds % 60).toFixed(1);
        return m > 0 ? `${m}:${s.padStart(4, '0')}` : s;
    };

    let maxRating = 0, minRating = 999;
    let maxTraining = 0, minTraining = 999;
    let minWeight = 999, maxWeight = 0;
    let minCycle = 999, maxCycle = 0;
    let topStartHorseNo = null, topFinishHorseNo = null;
    let topDistHorseNo = null, avgDistHorseNo = null, recentDistHorseNo = null;
    let topSIHorseNo = null, topBokWinHorseNo = null, topPrizeHorseNo = null, topDistWinHorseNo = null, topBestRecHorseNo = null;
    let topBestRecordValue = null;
    let bestTimeMap = {}, avgTimeMap = {}, recentTimeMap = {};
    let weightChangeMap = {};

    if (race?.horses) {
        const getCycleNum = (str) => {
            if (!str || str === '-') return null;
            const m = str.match(/\d+/);
            return m ? parseInt(m[0]) : null;
        };

        const ratings = race.horses.map(h => getNum(h.rating)).filter(v => v > 0);
        if (ratings.length > 0) { maxRating = Math.max(...ratings); minRating = Math.min(...ratings); }

        const trainings = race.horses.map(h => getNum(h.training_cnt)).filter(v => v > 0);
        if (trainings.length > 0) { maxTraining = Math.max(...trainings); minTraining = Math.min(...trainings); }

        const weights = race.horses.map(h => getNum(h.weight)).filter(w => w > 0);
        if (weights.length > 0) { minWeight = Math.min(...weights); maxWeight = Math.max(...weights); }

        const cycles = race.horses.map(h => getCycleNum(h.participation_period)).filter(v => v !== null);
        if (cycles.length > 0) { maxCycle = Math.max(...cycles); minCycle = Math.min(...cycles); }

        race.horses.forEach(h => {
            const actualHistory = h.recent_history?.filter(hist => !hist.class?.includes("주행")) || [];
            if (actualHistory.length > 0) {
                const lastWeight = getNum(actualHistory[0].weight);
                const curWeight = getNum(h.weight);
                if (lastWeight > 0 && curWeight > 0) {
                    const diff = (curWeight - lastWeight).toFixed(1);
                    weightChangeMap[h.horse_no] = diff > 0 ? `+${diff}` : diff;
                }
            }
        });

        const targetDistNum = info ? parseInt(info.distance.replace(/\D/g, '')) : 0;

        const horsePerformance = race.horses.map(h => {
            const validHistory = h.recent_history?.filter(hist =>
                parseInt(hist.distance) === targetDistNum && !hist.class?.includes("주행")
            ) || [];
            if (validHistory.length === 0) return { no: h.horse_no, best: 9999, avg: 9999, recent: 9999 };
            const times = validHistory.map(hist => timeToSeconds(hist.record));
            return {
                no: h.horse_no,
                best: Math.min(...times),
                avg: times.reduce((a, b) => a + b, 0) / times.length,
                recent: times[0]
            };
        });

        const globalBestDistTime = Math.min(...horsePerformance.map(p => p.best));
        const globalBestDistAvg = Math.min(...horsePerformance.map(p => p.avg));
        const globalBestRecentTime = Math.min(...horsePerformance.map(p => p.recent));

        topDistHorseNo = horsePerformance.find(p => p.best === globalBestDistTime && p.best < 9999)?.no;
        avgDistHorseNo = horsePerformance.find(p => p.avg === globalBestDistAvg && p.avg < 9999)?.no;
        recentDistHorseNo = horsePerformance.find(p => p.recent === globalBestRecentTime && p.recent < 9999)?.no;

        horsePerformance.forEach(p => {
            bestTimeMap[p.no] = p.best;
            avgTimeMap[p.no] = p.avg;
            recentTimeMap[p.no] = p.recent;
        });
    }
    if (stats?.fast_start_horses?.length > 0) topStartHorseNo = parseInt(stats.fast_start_horses[0].no);
    if (stats?.fast_finish_horses?.length > 0) topFinishHorseNo = parseInt(stats.fast_finish_horses[0].no);
    if (stats?.speed_index_horses?.length > 0) topSIHorseNo = parseInt(stats.speed_index_horses[0].no);
    if (stats?.horse_bok_win?.length > 0) topBokWinHorseNo = parseInt(stats.horse_bok_win[0].no);
    if (stats?.prize_money_6mon?.length > 0) topPrizeHorseNo = parseInt(stats.prize_money_6mon[0].no);
    if (stats?.dist_win_rate_horses?.length > 0) topDistWinHorseNo = parseInt(stats.dist_win_rate_horses[0].no);
    if (stats?.best_record_horses?.length > 0) {
        topBestRecHorseNo = parseInt(stats.best_record_horses[0].no);
        topBestRecordValue = stats.best_record_horses[0].rec;
    }

    return (
        <div className="max-w-md mx-auto min-h-screen flex flex-col bg-[#f8fafc] relative shadow-2xl font-sans">
            <header className="bg-slate-900 text-white pt-6 pb-6 px-6 rounded-b-[30px] shadow-xl z-20 relative">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <div className="bg-yellow-400 p-1.5 rounded-lg text-slate-900"><Icon name="trophy" size={16} /></div>
                        <span className="font-black italic text-lg tracking-tighter">SMART<span className="text-yellow-400">RACING</span> V10</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-slate-800 text-white text-xs font-bold px-2 py-1.5 rounded-lg outline-none border border-slate-700 focus:border-yellow-400" />
                        <button onClick={() => setViewMode(viewMode === 'app' ? 'admin' : 'app')} className={`p-2 rounded-full transition-colors ${viewMode === 'admin' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}><Icon name={viewMode === 'app' ? 'settings' : 'x'} size={16} /></button>
                    </div>
                </div>
                {viewMode === 'app' && (
                    <>
                        <div className="flex justify-between items-end">
                            <div>
                                <div className="text-[11px] text-slate-400 font-medium mb-1 flex items-center gap-1 opacity-80"><Icon name="calendar" size={12} /> {dbData.date || date}</div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-black text-white italic tracking-tight">{currentLocData.location_name} {race?.race_no}<span className="text-lg font-bold text-slate-400 not-italic ml-1">경주</span></h2>
                                    <div className="flex bg-slate-800 rounded-lg p-0.5 ml-2 border border-slate-700">
                                        <button onClick={() => changeLocation('seoul')} className={`px-2.5 py-1.5 rounded-md text-[10px] font-black transition-all ${loc === 'seoul' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}>서울</button>
                                        <button onClick={() => changeLocation('busan')} className={`px-2.5 py-1.5 rounded-md text-[10px] font-black transition-all ${loc === 'busan' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50' : 'text-slate-400'}`}>부산</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                            {races.map((r, i) => (
                                <button key={i} onClick={() => { setRaceIdx(i); setExpanded(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`flex-shrink-0 w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center transition-all ${raceIdx === i ? 'bg-yellow-400 text-slate-900 scale-110 shadow-lg ring-2 ring-yellow-400/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{r.race_no}</button>
                            ))}
                        </div>
                    </>
                )}
            </header>

            <main className="flex-1 p-0 pb-24 space-y-5">
                {viewMode === 'admin' ? (
                    <div className="p-6 animate-up">
                        <div className="bg-white p-6 rounded-3 shadow-lg border border-slate-100">
                            <label className="block w-full cursor-pointer group">
                                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center transition-colors group-hover:border-indigo-500 group-hover:bg-indigo-50">
                                    <span className="text-sm font-bold text-slate-600 group-hover:text-indigo-600">파일 선택하기</span>
                                    <input type="file" accept=".json" onChange={handleJsonUpload} className="hidden" />
                                </div>
                            </label>
                        </div>
                    </div>
                ) : (
                    <>
                        {info && (
                            <div className="sticky top-0 z-50 px-4 pt-0 pb-2">
                                <div className="sticky-header-blur rounded-3xl p-4 shadow-lg border border-slate-200/50 animate-up">
                                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-3">
                                                <span className="bg-indigo-600 text-white text-[11px] font-black px-2.5 py-1 rounded-lg">{info.class}</span>
                                                <span className="text-base font-bold text-slate-800 tabular">{info.distance}</span>
                                                <span className="text-xs text-slate-400 font-medium tabular">| {info.start_time}</span>
                                            </div>
                                            {info.conditions && (
                                                <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-0.5 bg-slate-100/50 px-2 py-0.5 rounded-md w-fit">
                                                    <Icon name="info" size={10} className="text-slate-400" /> {info.conditions}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">우승마 평균기록</span>
                                            <div className="font-black text-slate-800 text-sm tabular flex items-center gap-1"><Icon name="timer" size={14} className="text-indigo-500" />{stats?.avg_record || '-'}</div>
                                        </div>
                                    </div>
                                    {expert && (
                                        <div className="flex items-center gap-2 text-xs overflow-x-auto scrollbar-hide mt-1.5 pt-1 border-t border-slate-50">
                                            <div className="flex items-center gap-1 shrink-0">
                                                <span className="bg-slate-900 text-white px-2 py-0.5 rounded-lg text-[10px] font-bold">추천</span>
                                                <div className="flex -space-x-1.5">
                                                    {expert.picks?.map(no => <span key={no} className={`w-6 h-6 rounded-full font-bold text-[11px] flex items-center justify-center ring-1 ring-white ${getBadgeStyle(no)}`}>{no}</span>)}
                                                </div>
                                            </div>
                                            {expert.upset_picks && expert.upset_picks.length > 0 && (
                                                <>
                                                    <div className="w-px h-3 bg-slate-200 shrink-0 mx-0.5"></div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <span className="bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-lg text-[10px] font-bold">복병</span>
                                                        <div className="flex -space-x-1.5">
                                                            {expert.upset_picks.map(no => <span key={no} className={`w-6 h-6 rounded-full font-bold text-[11px] flex items-center justify-center ring-1 ring-white ${getBadgeStyle(no)}`}>{no}</span>)}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                            {expert.front_runners && expert.front_runners.length > 0 && (
                                                <>
                                                    <div className="w-px h-3 bg-slate-200 shrink-0 mx-0.5"></div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <span className="bg-orange-50 border border-orange-100 text-orange-600 px-2 py-0.5 rounded-lg text-[10px] font-bold">선행</span>
                                                        <div className="flex -space-x-1.5">
                                                            {expert.front_runners.map(no => <span key={no} className={`w-6 h-6 rounded-full font-bold text-[11px] flex items-center justify-center ring-1 ring-white ${getBadgeStyle(no)}`}>{no}</span>)}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="px-4 space-y-3">
                            {race?.horses.map((h, i) => {
                                const isExp = expanded === h.horse_no;
                                const picksText = expert?.picks_text?.find(p => parseInt(p.no) === h.horse_no)?.coment;
                                const isPick = expert?.picks?.includes(h.horse_no);
                                const targetDist = info ? parseInt(info.distance.replace(/\D/g, '')) : 0;
                                const recentRecObj = h.recent_history?.find(r => r.distance === targetDist);
                                const recentRecord = recentRecObj ? recentRecObj.record : null;
                                const myWeight = getNum(h.weight);

                                const badges = [];

                                // 최근 4경기 착순 배지 데이터 준비
                                const rankBadges = [];
                                if (h.recent_history) {
                                    h.recent_history.slice(0, 4).forEach(hist => {
                                        const isSameDist = info && parseInt(info.distance.replace(/\D/g, '')) === parseInt(hist.distance?.toString().replace(/\D/g, ''));
                                        const isTraining = hist.class?.includes("주행");
                                        const rank = hist.result_rank || '-';
                                        const isHighRank = parseInt(rank) <= 3;

                                        let badgeColor = "gray";
                                        if (isSameDist) badgeColor = "yellow";
                                        else if (isTraining) badgeColor = "purple";

                                        rankBadges.push({
                                            text: (isTraining && !isHighRank) ? '주' : rank,
                                            color: badgeColor,
                                            isHighRank: isHighRank,
                                            isTraining: isTraining
                                        });
                                    });
                                }

                                if (recentRecord) badges.push({ emoji: "⏱️", text: recentRecord, color: "yellow" });
                                if (isPick) badges.push({ emoji: "⭐", text: "추천", color: "red" });
                                if (expert?.upset_picks?.includes(h.horse_no)) badges.push({ emoji: "💣", text: "복병", color: "purple" });
                                if (expert?.front_runners?.includes(h.horse_no)) badges.push({ emoji: "🐎", text: "선행", color: "orange" });

                                if (h.horse_no === topBestRecHorseNo) badges.push({ emoji: "🥇", text: `TOP ${topBestRecordValue || '-'}`, color: "yellow" });
                                if (h.horse_no === topSIHorseNo) badges.push({ emoji: "📈", text: "지수1위", color: "purple" });
                                if (h.horse_no === topBokWinHorseNo) badges.push({ emoji: "🎯", text: "복승1위", color: "green" });
                                if (h.horse_no === topPrizeHorseNo) badges.push({ emoji: "💰", text: "상금1위", color: "orange" });
                                if (h.horse_no === topDistWinHorseNo) badges.push({ emoji: "🏁", text: "거리승률1위", color: "green" });
                                if (h.horse_no === avgDistHorseNo) badges.push({ emoji: "📊", text: `AVG ${formatTime(avgTimeMap[h.horse_no])}`, color: "blue" });
                                if (h.horse_no === recentDistHorseNo) badges.push({ emoji: "🕒", text: `REC ${formatTime(recentTimeMap[h.horse_no])}`, color: "green" });

                                const actualHistory = h.recent_history?.filter(hist => !hist.class?.includes("주행")) || [];
                                const lastActualRace = actualHistory[0];

                                if (info && h.grade) {
                                    const curRaceC = getClassNum(info.class);
                                    const horseGradeC = getClassNum(h.grade);
                                    const lastRaceC = lastActualRace ? getClassNum(lastActualRace.class) : null;

                                    if (curRaceC < horseGradeC) {
                                        badges.push({ emoji: "🚀", text: "점핑전", color: "red" });
                                    } else if (curRaceC === horseGradeC) {
                                        const hasPlayedThisGrade = actualHistory.some(hist => getClassNum(hist.class) <= curRaceC);
                                        if (!hasPlayedThisGrade) {
                                            if (curRaceC === 6) badges.push({ emoji: "🆕", text: "데뷔전", color: "red" });
                                            else badges.push({ emoji: "🆙", text: "승급전", color: "red" });
                                        }
                                    }
                                    if (lastRaceC !== null && curRaceC > lastRaceC) {
                                        badges.push({ emoji: "⬇️", text: "강급전", color: "gray" });
                                    }
                                }

                                if (lastActualRace && lastActualRace.jockey !== h.jockey) badges.push({ emoji: "🔄", text: "기수교체", color: "gray" });
                                if (getNum(h.training_cnt) === maxTraining && maxTraining > 0) badges.push({ emoji: "💪", text: "훈련왕", color: "blue" });
                                if (getNum(h.rating) === maxRating && maxRating > 0) badges.push({ emoji: "👑", text: "레이팅왕", color: "purple" });
                                if (h.horse_no === topStartHorseNo) badges.push({ emoji: "🚀", text: "초반", color: "red" });
                                if (h.horse_no === topFinishHorseNo) badges.push({ emoji: "⚡", text: "후반", color: "blue" });
                                if (myWeight > 0) {
                                    if (myWeight === minWeight) badges.push({ emoji: "🪶", text: "부중↓", color: "cyan" });
                                    if (myWeight === maxWeight) badges.push({ emoji: "🏋️", text: "부중↑", color: "orange" });
                                }
                                if (h.equipment) {
                                    h.equipment.split(',').forEach(eq => {
                                        const trimmed = eq.trim();
                                        const baseName = trimmed.replace(/[+-]/g, '').trim();
                                        const desc = EQUIPMENT_INFO[baseName] || "";
                                        if (trimmed.includes('+')) badges.push({ emoji: "🛡️", text: trimmed, color: "purple", desc });
                                        else if (trimmed.includes('-')) badges.push({ emoji: "🛡️", text: trimmed, color: "gray", desc });
                                    });
                                }


                                return (
                                    <div key={h.horse_no} className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden animate-up ${isExp ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-100'}`} style={{ animationDelay: `${0.2 + (i * 0.05)}s` }}>
                                        <div className="p-3 flex items-stretch cursor-pointer" onClick={() => {
                                            if (expanded === h.horse_no) {
                                                setExpanded(null);
                                            } else {
                                                setExpanded(h.horse_no);
                                                setSubTab('records');
                                            }
                                        }}>
                                            {/* 좌측 구획: 마명정보(상) + 상세수치(하) - 너비 최적화 */}
                                            <div className="flex flex-col w-[185px] shrink-0 pr-4 relative">
                                                {/* Equipment Tooltip Overlay */}
                                                {hoveredEq && hoveredEq.horseNo === h.horse_no && (
                                                    <div className="absolute inset-x-0 inset-y-[-4px] bg-slate-900/95 text-white p-2 rounded-xl z-[60] flex flex-col justify-center animate-fade-in shadow-xl border border-slate-700">
                                                        <div className="flex items-center gap-1.5 mb-1 text-yellow-400 font-black text-[10px]">
                                                            <Icon name="info" size={10} />
                                                            {hoveredEq.text}
                                                        </div>
                                                        <div className="text-[10px] leading-tight font-medium text-slate-100">
                                                            {hoveredEq.desc}
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className={`w-[40px] h-[40px] rounded-xl flex items-center justify-center font-black text-lg italic tracking-tighter shrink-0 ${getBadgeStyle(h.horse_no)}`}>{h.horse_no}</div>
                                                    <div className="flex flex-col justify-center overflow-hidden">
                                                        <div className="flex items-center gap-1 mb-0.5">
                                                            <h3 className="font-bold text-slate-900 text-[14px] truncate">{h.name}</h3>
                                                            <span className="text-[9px] text-slate-400 font-bold bg-slate-100 px-1 rounded shrink-0">{h.grade}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-[9px] truncate">
                                                            <span className="text-slate-400">{h.origin}/{h.sex}/{h.age}</span>
                                                            <span className="text-indigo-600 font-bold ml-1">{h.jockey}</span>
                                                        </div>
                                                        <div className="text-[8px] text-slate-400 truncate">
                                                            {h.trainer} / {h.owner}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 상세 수치 정보 (좌측 하단 - 밀도 극대화 배치) */}
                                                <div className="flex flex-row justify-start items-center gap-x-1.5 pt-2 border-t border-slate-100">
                                                    <div className="flex flex-col items-start shrink-0">
                                                        <span className="text-[8px] text-slate-400 leading-tight">부중</span>
                                                        <span className={`text-[10px] font-bold tabular leading-tight ${getNum(h.weight) === maxWeight ? 'text-rose-500' : getNum(h.weight) === minWeight ? 'text-blue-500' : 'text-slate-700'}`}>
                                                            {h.weight}{weightChangeMap[h.horse_no] ? `(${weightChangeMap[h.horse_no]})` : ''}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col items-start shrink-0 border-l border-slate-100 pl-1.5">
                                                        <span className="text-[8px] text-slate-400 leading-tight">훈련</span>
                                                        <span className={`text-[10px] font-bold tabular leading-tight ${getNum(h.training_cnt) === maxTraining ? 'text-rose-500' : getNum(h.training_cnt) === minTraining ? 'text-blue-500' : 'text-slate-700'}`}>
                                                            {h.training_cnt || '-'}회
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col items-start shrink-0 border-l border-slate-100 pl-1.5">
                                                        <span className="text-[8px] text-slate-400 leading-tight">주기</span>
                                                        <span className={`text-[10px] font-bold tabular leading-tight ${((str) => { const m = str?.match(/\d+/); return m ? parseInt(m[0]) : null })(h.participation_period) === maxCycle ? 'text-rose-500' : ((str) => { const m = str?.match(/\d+/); return m ? parseInt(m[0]) : null })(h.participation_period) === minCycle ? 'text-blue-500' : 'text-slate-700'}`}>
                                                            {h.participation_period || '-'}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col items-start shrink-0 border-l border-slate-100 pl-1.5">
                                                        <span className="text-[8px] text-slate-400 leading-tight">레이팅</span>
                                                        <span className={`text-[10px] font-bold tabular leading-tight ${getNum(h.rating) === maxRating ? 'text-rose-500' : getNum(h.rating) === minRating ? 'text-blue-500' : 'text-slate-700'}`}>
                                                            {h.rating}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 우측 구획: 모든 배지 섹션 - 형태 통일 */}
                                            <div className="flex-1 flex flex-wrap gap-1 items-start content-start pl-3 py-0.5">
                                                {rankBadges.length > 0 && (
                                                    <div className="flex items-center gap-0.5 p-0.5 bg-slate-100/50 rounded border border-slate-200/60 shadow-inner">
                                                        {rankBadges.map((rb, rbIdx) => (
                                                            <div key={rbIdx} className={`w-[18px] h-[18px] flex items-center justify-center text-[9px] ${rb.isTraining ? 'bg-white border border-indigo-300 text-indigo-500 rounded-sm' :
                                                                rb.color === 'yellow' ? 'bg-amber-100 text-amber-700 border border-amber-200 rounded-sm' :
                                                                    'bg-slate-100 text-slate-500 border border-slate-200/50 rounded-sm'
                                                                }`}>
                                                                <span className={`${rb.isHighRank ? 'font-black text-rose-600' : 'font-medium'}`}>{rb.text}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {badges.map((b, idx) => (
                                                    <div 
                                                        key={idx} 
                                                        className={`flex-shrink-0 px-2 py-0.5 rounded flex items-center border relative group ${b.desc ? 'cursor-help' : ''} ${b.color === 'red' ? 'bg-red-50 text-red-600 border-red-100' :
                                                        b.color === 'blue' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                            b.color === 'green' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                b.color === 'purple' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                                    b.color === 'yellow' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                                        b.color === 'cyan' ? 'bg-cyan-50 text-cyan-600 border-cyan-100' :
                                                                            b.color === 'orange' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                                                'bg-slate-50 text-slate-600 border-slate-100'
                                                        }`}
                                                        onMouseEnter={() => b.desc && setHoveredEq({ horseNo: h.horse_no, text: b.text, desc: b.desc })}
                                                        onMouseLeave={() => setHoveredEq(null)}
                                                        onClick={(e) => {
                                                            if (b.desc) {
                                                                e.stopPropagation();
                                                                if (hoveredEq?.text === b.text) setHoveredEq(null);
                                                                else setHoveredEq({ horseNo: h.horse_no, text: b.text, desc: b.desc });
                                                            }
                                                        }}
                                                    >
                                                        {b.emoji && <span className="text-[10px] mr-1">{b.emoji}</span>}
                                                        <span className="text-[9px] font-bold whitespace-nowrap">{b.text}</span>
                                                    </div>
                                                ))}
                                                {h.steward_trip_note?.note?.includes("출발 늦음") && (
                                                    <div className="bg-orange-50 text-orange-600 border-orange-100 px-2 py-0.5 rounded text-[10px] font-bold border">출발늦음</div>
                                                )}
                                                {h.steward_trip_note?.note?.includes("모래 반응") && (
                                                    <div className="bg-amber-50 text-amber-600 border-amber-100 px-2 py-0.5 rounded text-[10px] font-bold border">모래반응</div>
                                                )}
                                                {h.medical_alerts?.some(m => m.detail?.includes("폐출혈")) && (
                                                    <div className="bg-red-50 text-red-600 border-red-100 px-2 py-0.5 rounded text-[10px] font-black border animate-pulse">폐출혈전력</div>
                                                )}
                                                {h.medical_alerts?.length > 0 && !h.medical_alerts?.every(m => m.detail?.includes("폐출혈")) && (
                                                    <div className="bg-emerald-50 text-emerald-600 border-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold border">진료내역</div>
                                                )}
                                            </div>
                                        </div>
                                        {isExp && (
                                            <div className="bg-slate-50/50 border-t border-slate-100 p-5">
                                                {picksText ? (
                                                    <div className="mb-4 bg-white p-4 rounded-2xl border-l-[3px] border-yellow-400 shadow-sm">
                                                        <div className="flex items-center gap-2 mb-2 text-yellow-600 font-black text-[10px] uppercase tracking-wider">
                                                            <Icon name="message-circle" size={12} /> Expert Insight
                                                        </div>
                                                        <p className="text-[13px] font-medium text-slate-700 leading-relaxed break-keep tracking-tight">
                                                            {picksText}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="mb-4 text-center text-xs text-slate-400 py-2 border border-dashed border-slate-200 rounded-xl">전문가 코멘트 없음</div>
                                                )}

                                                <div className="flex gap-1 mb-4 p-1 bg-slate-100 rounded-xl w-fit">
                                                    {[
                                                        { id: 'records', label: '지난경기기록', icon: 'list' },
                                                        { id: 'judicial', label: '심판리포트', icon: 'alert-circle' },
                                                        { id: 'medical', label: '진료현황', icon: 'plus-square' },
                                                        { id: 'special', label: '특이사항', icon: 'file-text' }
                                                    ].map(tab => (
                                                        <button
                                                            key={tab.id}
                                                            onClick={(e) => { e.stopPropagation(); setSubTab(tab.id); }}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${subTab === tab.id ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                                        >
                                                            <Icon name={tab.icon} size={12} />
                                                            {tab.label}
                                                            {tab.id === 'judicial' && h.steward_trip_note && <span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>}
                                                            {tab.id === 'medical' && h.medical_alerts?.length > 0 && <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>}
                                                            {tab.id === 'special' && (h.special_note || horseNotes[h.name]) && <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>}
                                                        </button>
                                                    ))}
                                                </div>

                                                {subTab === 'records' && (
                                                    <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
                                                        <table className="w-full text-[11px] text-center whitespace-nowrap">
                                                            <thead className="bg-slate-50 text-slate-400 border-b">
                                                                <tr>
                                                                    <th className="py-2 px-2 text-left pl-4">날짜</th>
                                                                    <th>등급</th>
                                                                    <th>거리</th>
                                                                    <th>기록</th>
                                                                    <th>순위</th>
                                                                    <th>부중</th>
                                                                    <th>기수</th>
                                                                    <th>S1F</th>
                                                                    <th>G3F</th>
                                                                    <th className="pr-4">G1F</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y tabular">
                                                                {h.recent_history?.map((hist, hIdx) => (
                                                                    <tr key={hIdx} className="hover:bg-slate-50/50 transition-colors">
                                                                        <td className="py-2 px-2 pl-4 text-left text-slate-500 font-medium">{hist.date}</td>
                                                                        <td className="text-slate-700 text-[10px]">{hist.class}</td>
                                                                        <td>{hist.distance}</td>
                                                                        <td className="font-bold text-slate-900">{hist.record}</td>
                                                                        <td className={`font-bold ${hist.result_rank <= 3 ? 'text-rose-600' : 'text-slate-400'}`}>{hist.result_rank}위</td>
                                                                        <td className="text-slate-600">{hist.weight}</td>
                                                                        <td className="text-[10px] font-medium">{hist.jockey}</td>
                                                                        <td>{hist.s1f}</td>
                                                                        <td className="text-green-600 font-bold">{hist.g3f}</td>
                                                                        <td className="pr-4">{hist.g1f}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                        {(!h.recent_history || h.recent_history.length === 0) && (
                                                            <div className="py-8 text-center text-slate-400 text-xs">최근 경기 기록이 없습니다.</div>
                                                        )}
                                                    </div>
                                                )}

                                                {subTab === 'judicial' && (
                                                    <div className="space-y-2">
                                                        {h.steward_trip_note ? (
                                                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm border-l-[3px] border-orange-400">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded capitalize">{h.steward_trip_note.date}</span>
                                                                        <span className="text-[10px] text-slate-400 font-bold">심판리포트</span>
                                                                    </div>
                                                                    <p className="text-[12px] text-slate-700 leading-relaxed font-medium">{h.steward_trip_note.note}</p>
                                                                </div>
                                                        ) : (
                                                            <div className="py-8 bg-white rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">등록된 심판리포트가 없습니다.</div>
                                                        )}
                                                    </div>
                                                )}

                                                {subTab === 'medical' && (
                                                    <div className="space-y-2">
                                                        {h.medical_alerts?.length > 0 ? (
                                                            h.medical_alerts.map((med, mIdx) => (
                                                                <div key={mIdx} className={`bg-white p-4 rounded-xl border border-slate-100 shadow-sm border-l-[3px] ${med.detail?.includes("폐출혈") ? 'border-red-500 bg-red-50/20' : 'border-emerald-400'}`}>
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${med.detail?.includes("폐출혈") ? 'text-red-700 bg-red-100' : 'text-emerald-700 bg-emerald-100'}`}>
                                                                            {med.date}
                                                                        </span>
                                                                        {med.detail?.includes("폐출혈") && <span className="text-[10px] font-black text-red-600 animate-pulse">⚠️ 폐출혈 주의</span>}
                                                                    </div>
                                                                    <p className="text-[12px] text-slate-700 leading-relaxed font-medium">{med.detail}</p>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="py-8 bg-white rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">최근 진료 내역이 없습니다.</div>
                                                        )}
                                                    </div>
                                                )}

                                                {subTab === 'special' && (
                                                    <div className="space-y-4">
                                                        {h.special_note && h.special_note.trim() && (
                                                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm border-l-[4px] border-yellow-400">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[10px] font-black text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded">출전표 특이사항</span>
                                                                        <span className="text-[9px] text-slate-400 font-bold">(수정불가)</span>
                                                                    </div>
                                                                </div>
                                                                <p className="text-[12px] text-slate-700 leading-relaxed font-medium">{h.special_note}</p>
                                                            </div>
                                                        )}
                                                        
                                                        {/* 직접 입력한 메모 리스트 */}
                                                        {horseNotes[h.name] && Array.isArray(horseNotes[h.name]) && horseNotes[h.name].filter(n => n && n.content && n.content.trim()).map((note) => (
                                                            <div key={note.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-md border-l-[4px] border-indigo-500 relative transition-all">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">{note.date}</span>
                                                                    </div>
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); deleteHorseNoteItem(h.name, note.id); }}
                                                                        className="flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-600 rounded-md hover:bg-rose-100 transition-all border border-rose-100"
                                                                        title="메모 삭제"
                                                                    >
                                                                        <Icon name="trash-2" size={12} />
                                                                        <span className="text-[10px] font-bold">삭제</span>
                                                                    </button>
                                                                </div>
                                                                <div className="text-[13px] text-slate-800 leading-relaxed font-semibold whitespace-pre-wrap py-1">
                                                                    {note.content}
                                                                </div>
                                                            </div>
                                                        ))}

                                                        <div className="bg-slate-100/50 p-4 rounded-2xl border border-slate-200 border-dashed">
                                                            <div className="flex items-center gap-2 mb-3 text-slate-500 font-bold text-[10px] uppercase">
                                                                <Icon name="edit-3" size={12} /> 새 메모 작성
                                                            </div>
                                                            <textarea
                                                                className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 min-h-[80px] bg-white shadow-inner"
                                                                placeholder={`${h.name}의 특이사항을 입력하세요... (${date} 날짜로 저장됩니다)`}
                                                                value={notesInput[h.name] || ''}
                                                                onChange={(e) => setNotesInput({...notesInput, [h.name]: e.target.value})}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                            <div className="flex justify-end mt-2">
                                                                <button
                                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] px-6 py-2.5 rounded-lg font-black transition-all shadow-md active:scale-95 flex items-center gap-2"
                                                                    onClick={(e) => { e.stopPropagation(); saveHorseNote(h.name, notesInput[h.name]); }}
                                                                >
                                                                    <Icon name="check" size={14} /> 메모 저장하기
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {stats && (
                            <div className="px-4 pb-10">
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 animate-up">
                                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-6"><div className="bg-green-100 p-1 rounded text-green-600"><Icon name="bar-chart-2" size={14} /></div>데이터 분석</h3>
                                    <div className="space-y-8">
                                        {stats.fast_start_horses?.length > 0 && (
                                            <div><div className="flex justify-between items-center mb-3"><span className="text-[11px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md">초반 스피드 (S1F)</span></div><BarChart data={stats.fast_start_horses} color="red" /></div>
                                        )}
                                        {stats.fast_finish_horses?.length > 0 && (
                                            <div><div className="flex justify-between items-center mb-3"><span className="text-[11px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-md">후반 탄력 (G1F)</span></div><BarChart data={stats.fast_finish_horses} color="blue" /></div>
                                        )}
                                        {stats.best_record_horses?.length > 0 && (
                                            <div><div className="flex justify-between items-center mb-3"><span className="text-[11px] font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded-md">{info?.distance || '거리'} 최고 기록</span></div><BarChart data={stats.best_record_horses} color="yellow" /></div>
                                        )}
                                        {stats.speed_index_horses?.length > 0 && (
                                            <div><div className="flex justify-between items-center mb-3"><span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md">속도지수 (Speed Index)</span></div><ValueChart data={stats.speed_index_horses} color="purple" valueKey="idx" /></div>
                                        )}
                                        {stats.dist_win_rate_horses?.length > 0 && (
                                            <div><div className="flex justify-between items-center mb-3"><span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">{info?.distance || '거리별'} 승률</span></div><ValueChart data={stats.dist_win_rate_horses} color="green" valueKey="win_rate" /></div>
                                        )}
                                        {stats.horse_bok_win?.length > 0 && (
                                            <div><div className="flex justify-between items-center mb-3"><span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">전체 복승률</span></div><ValueChart data={stats.horse_bok_win} color="blue" valueKey="bok_win" /></div>
                                        )}
                                        {stats.prize_money_6mon?.length > 0 && (
                                            <div><div className="flex justify-between items-center mb-3"><span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">최근 6개월 상금</span></div><ValueChart data={stats.prize_money_6mon} color="purple" valueKey="won" /></div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) || <div className="px-4 py-10 text-center text-slate-400 text-xs">선택된 경주에 대한 분석 데이터가 없습니다.</div>}
                    </>
                )}
            </main>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

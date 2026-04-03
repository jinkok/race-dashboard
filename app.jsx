import React from 'react';
import Icon from './src/components/Icon.jsx';
import { getBadgeStyle } from './src/utils/getBadgeStyle.js';
import BarChart from './src/components/Charts/BarChart.jsx';
import ValueChart from './src/components/Charts/ValueChart.jsx';
import SimulationZone from './src/components/Simulation/SimulationZone.jsx';

const { useState, useEffect, useRef, useLayoutEffect } = React;

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
    "승인편자": "경주 시 바닥 접지력과 발 보호를 위해 승인된 특수 편자 (주로의 상태나 말의 발 상태에 맞춰 착용)",
    "가지": "양옆으로 뻗은 '가지'는 재갈이 입안으로 딸려 들어가는 것을 막아줍니다 (달리면서 좌우로 심하게 기대거나, 고개를 심하게 흔드는 산만한 말들을 통제하는 데 탁월)"
};

function App() {


    const formatDisplayDate = (d) => {
        if (!d || d === "데이터 없음") return d;
        const numbers = d.replace(/[^0-9]/g, "");
        if (numbers.length >= 8) {
            const year = numbers.substring(0, 4);
            const month = numbers.substring(numbers.length - 4, numbers.length - 2);
            const day = numbers.substring(numbers.length - 2);
            return `${year}. ${month}. ${day}.`;
        }
        return d;
    };


    const TicketSlot = ({ idx, activeGameIdx, setActiveGameIdx, g, count, results, realtimeResults, checkBetWin }) => {
        const isActive = activeGameIdx === idx;
        const hasSelection = count > 0;
        
        // 🥇 결과 우선순위: 크롤링 데이터 > 수동 입력 데이터
        // 🚨 인덱싱 통일: { 1: 마번, 2: 마번, 3: 마번 } 형태로 변환 (checkBetWin 호환용)
        let finalResults = null;
        if (realtimeResults && realtimeResults.winners) {
            finalResults = { 
                1: realtimeResults.winners[0], 
                2: realtimeResults.winners[1], 
                3: realtimeResults.winners[2] 
            };
        } else if (Array.isArray(results) && results.length > 0) {
            finalResults = { 
                1: results[0], 
                2: results[1], 
                3: results[2] 
            };
        }
            
        const isWin = finalResults && checkBetWin(g.type, g.ranks, finalResults);

        // 결과에 따른 보더 색상 결정
        const getResultBorder = () => {
            if (isWin) return 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/50';
            if (results && hasSelection && !isWin) return 'border-rose-500 opacity-80';
            return isActive ? 'border-blue-500' : 'border-slate-700';
        };

        return (
            <button
                onClick={() => setActiveGameIdx(idx)}
                className={`h-full rounded-xl font-black transition-all duration-300 ease-out flex items-center px-1.5 relative border-2 ${isActive
                        ? 'flex-[12] bg-blue-600 text-white shadow-lg'
                        : 'flex-1 bg-slate-800 text-slate-500 hover:text-slate-400'
                    } ${getResultBorder()}`}
            >
                <div className="flex items-center min-w-0 w-full h-full relative">
                    <span className={`text-[10px] shrink-0 font-black ${isActive ? 'bg-blue-800 px-1.5 py-1 rounded-lg mr-2' : (isWin ? 'text-emerald-400' : 'text-slate-600')}`}>
                        {idx + 1}
                    </span>

                    {isActive ? (
                        <div className="flex-1 flex items-center min-w-0 animate-in fade-in slide-in-from-right-2 duration-300">
                            <span className="text-[11px] font-bold leading-tight truncate text-left whitespace-nowrap">
                                {hasSelection ? `${g.type}>${Object.values(g.ranks).map(r => r.join(',')).filter(s => s).join('/')} (${count}조)` : "미배팅"}
                            </span>
                            {isWin && <Icon name="trophy" size={12} className="ml-2 text-yellow-400 animate-bounce" />}
                        </div>
                    ) : (
                        (isWin || hasSelection) && (
                            <div className={`absolute right-0 top-1/2 -translate-y-1/2 ${isWin ? 'text-emerald-400' : 'text-slate-500'} animate-in zoom-in duration-300`}>
                                <Icon name={isWin ? "trophy" : "check-circle-2"} size={10} />
                            </div>
                        )
                    )}
                </div>
            </button>
        );
    };


    const [user, setUser] = useState(null);
    const [viewMode, setViewMode] = useState('app');
    const [syncStatus, setSyncStatus] = useState('connecting');
    const [date, setDate] = useState(() => {
        const saved = localStorage.getItem('race_last_date');
        if (saved) return saved;
        // KST 기준 오늘 날짜 생성
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [loc, setLoc] = useState(() => localStorage.getItem('race_last_loc') || 'seoul');
    const [raceIdx, setRaceIdx] = useState(() => {
        const saved = localStorage.getItem('race_last_idx');
        return saved !== null ? parseInt(saved) : 0;
    });
    const [expanded, setExpanded] = useState(null);
    const [subTab, setSubTab] = useState('records');
    const [horseNotes, setHorseNotes] = useState({});
    const [notesInput, setNotesInput] = useState({});
    const [hoveredEq, setHoveredEq] = useState(null);
    const [sireMap, setSireMap] = useState({});

    // 🐎 [신규] 외부 데이터 로드 (SIRE_DATA, TRACK_INFO, STATS)
    const [trackInfo, setTrackInfo] = useState(null);
    const [mergedRaceData, setMergedRaceData] = useState(null);
    const [isSimOpen, setIsSimOpen] = useState(false);

    useEffect(() => {
        // Sire Info
        fetch('sire_info.json')
            .then(res => res.json())
            .then(data => {
                const map = {};
                data.forEach(s => { if (s.kr) map[s.kr] = s; });
                setSireMap(map);
            }).catch(err => console.error("Sire data load error:", err));

        // Track Info
        fetch('race_track_info.json')
            .then(res => res.json())
            .then(setTrackInfo)
            .catch(err => console.error("Track info load error:", err));


        // Merged Race Data (Optional, but contains stats_analysis)
        fetch('Merged_Race_Data_20260405.json')
            .then(res => res.json())
            .then(setMergedRaceData)
            .catch(err => console.error("Merged race data load error:", err));
    }, []);

    const [selectedHorses, setSelectedHorses] = useState([]); // legacy UI sync
    const [activeGameIdx, setActiveGameIdx] = useState(() => {
        const saved = localStorage.getItem('race_last_game_idx');
        return saved !== null ? parseInt(saved) : 0;
    });
    const [betGames, setBetGames] = useState(() => {
        const pickPath = `picks_${date}_${loc}_${raceIdx + 1}`;
        const saved = localStorage.getItem(`local_${pickPath}`);
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { console.error("Local load error:", e); }
        }
        return [
            { id: 1, type: '단승', ranks: { 1: [], 2: [], 3: [] }, amount: 1000 },
            { id: 2, type: '단승', ranks: { 1: [], 2: [], 3: [] }, amount: 1000 },
            { id: 3, type: '단승', ranks: { 1: [], 2: [], 3: [] }, amount: 1000 }
        ];
    });
    const [betMemo, setBetMemo] = useState(() => {
        const pickPath = `picks_${date}_${loc}_${raceIdx + 1}`;
        return localStorage.getItem(`local_memo_${pickPath}`) || '';
    });
    const [isBetPanelOpen, setIsBetPanelOpen] = useState(false);
    const [raceResults, setRaceResults] = useState({});
    const [realtimeResults, setRealtimeResults] = useState(null);
    const [realtimeWeights, setRealtimeWeights] = useState(null);
    const [isResultEditMode, setIsResultEditMode] = useState(false);
    const [picksStatus, setPicksStatus] = useState('loading'); // 'loading', 'synced', 'local', 'modified'
    const lastLoadedPath = useRef(null);
    const dateInputRef = useRef(null);

    // ErrorBoundary(에러 화면)에서 현재 sync 상태를 보여주기 위해 브라우저에 기록합니다.
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.__RACE_SYNC_STATUS__ = syncStatus;
            window.__RACE_PICKS_STATUS__ = picksStatus;
        }
    }, [syncStatus, picksStatus]);

    // 베팅 조합(게임) 수 계산 로직
    // 승식 조합 계산 편의 함수
    const combinations = (n, r) => {
        if (r < 0 || r > n) return 0;
        if (r === 0 || r === n) return 1;
        let res = 1;
        for (let i = 1; i <= (r > n / 2 ? n - r : r); i++) res = (res * (n - i + 1)) / i;
        return Math.floor(res);
    };

    // 🐎 [수정됨] 실전 베팅 룰이 적용된 상세 조합 생성 로직 (배열 형태)
    const getBetCombinationList = (type, ranks) => {
        const r1 = ranks?.[1] || [];
        const r2 = ranks?.[2] || [];
        const r3 = ranks?.[3] || [];
        if (r1.length === 0) return [];

        let results = [];
        const typeKey = type; // 단승, 연승, 복승 등

        // 1. 박스(BOX) 판정 (1열에만 듬뿍 찍었을 때)
        const minRequired = type.includes('삼') ? 3 : (['단승', '연승'].includes(type) ? 1 : 2);
        const isBox = r1.length >= minRequired && r2.length === 0 && r3.length === 0 && ['복승', '쌍승', '복연승', '삼복승', '삼쌍승'].includes(type);

        if (isBox) {
            if (type === '삼쌍승') {
                for (let i of r1) for (let j of r1) for (let k of r1) if (i !== j && i !== k && j !== k) results.push([i, j, k]);
            } else if (type === '삼복승') {
                for (let i = 0; i < r1.length; i++) for (let j = i + 1; j < r1.length; j++) for (let k = j + 1; k < r1.length; k++) results.push([r1[i], r1[j], r1[k]]);
            } else if (type === '쌍승') {
                for (let i of r1) for (let j of r1) if (i !== j) results.push([i, j]);
            } else if (['복승', '복연승'].includes(type)) {
                for (let i = 0; i < r1.length; i++) for (let j = i + 1; j < r1.length; j++) results.push([r1[i], r1[j]]);
            }
            return results;
        }

        // 2. 포메이션(Formation) / 축마 모드
        if (type === '삼쌍승') {
            r1.forEach(h1 => {
                r2.forEach(h2 => {
                    if (h1 === h2) return;
                    r3.forEach(h3 => {
                        if (h3 === h1 || h3 === h2) return;
                        results.push([h1, h2, h3]);
                    });
                });
            });
        } else if (type === '삼복승') {
            const uniqueSets = new Set();
            r1.forEach(h1 => {
                r2.forEach(h2 => {
                    if (h1 === h2) return;
                    // 실전 룰: 3착이 없으면 2착 풀 공유
                    const r3Pool = r3.length > 0 ? r3 : r2;
                    r3Pool.forEach(h3 => {
                        if (h3 === h1 || h3 === h2) return;
                        const combo = [h1, h2, h3].sort((a, b) => a - b);
                        const key = combo.join(',');
                        if (!uniqueSets.has(key)) { uniqueSets.add(key); results.push(combo); }
                    });
                });
            });
        } else if (['쌍승', '복승', '복연승'].includes(type)) {
            const isOrdered = type === '쌍승';
            const uniqueSets = new Set();
            r1.forEach(h1 => {
                r2.forEach(h2 => {
                    if (h1 === h2) return;
                    if (isOrdered) {
                        results.push([h1, h2]);
                    } else {
                        const combo = [h1, h2].sort((a, b) => a - b);
                        const key = combo.join(',');
                        if (!uniqueSets.has(key)) { uniqueSets.add(key); results.push(combo); }
                    }
                });
            });
        } else if (['단승', '연승'].includes(type)) {
            r1.forEach(h => results.push([h]));
        }

        return results;
    };

    // 🏆 [신규] 당첨여부 판정 로직
    const checkBetWin = (type, ranks, officialResults) => {
        if (!officialResults || !officialResults[1]) return false;
        const res = [Number(officialResults[1]), Number(officialResults[2]), Number(officialResults[3])];
        const combos = getBetCombinationList(type, ranks);
        if (combos.length === 0) return false;

        return combos.some(combo => {
            // 순서 상관 있는 승식
            if (['단승', '쌍승', '삼쌍승'].includes(type)) {
                return combo.every((h, i) => h === res[i]);
            }
            // 연승 (3위 이내 1두)
            if (type === '연승') return res.includes(combo[0]);
            // 복연승 (3위 이내 2두)
            if (type === '복연승') return combo.every(h => res.includes(h));
            // 복승/삼복승 (순서 상관 없이 정렬후 비교)
            const sortedRes = res.slice(0, combo.length).sort((a, b) => a - b);
            const sortedCombo = [...combo].sort((a, b) => a - b);
            return JSON.stringify(sortedRes) === JSON.stringify(sortedCombo);
        });
    };

    const getBetCombinationCount = (type, ranks) => {
        // 복잡한 케이스가 많으므로 실제 리스트 생성 함수의 길이를 반환 (일관성 보장)
        // 단, 성능을 위해 실무에선 최적화 가능하지만 현재 데이터 세트에선 리스트 생성이 더 정확함
        return getBetCombinationList(type, ranks).length;
    };

    // 렌더에서 `getBetCombinationCount(...)` 호출이 여러 번 일어나므로,
    // 슬롯별 조합 수/총합을 한 번만 계산해서 UI에서 재사용합니다.
    const betCombinationCounts = React.useMemo(() => {
        return betGames.map(g => getBetCombinationCount(g.type, g.ranks));
    }, [betGames]);

    const totalBetCombinationCount = React.useMemo(() => {
        return betCombinationCounts.reduce((acc, c) => acc + c, 0);
    }, [betCombinationCounts]);

    const defaultData = {
        date: "데이터 없음",
        locations: {
            seoul: { location_name: "서울", races: [] },
            busan: { location_name: "부산", races: [] }
        }
    };
    const [dbData, setDbData] = useState(defaultData);

    // 이름 정규화 함수 (감량기호 등 제거)
    const normalizeName = (name) => (name || '').replace(/[^가-힣]/g, '').trim();

    // 🏆 [신규] 금일 기수/조교사 성적 집계 (트로피용) - flat object 구조 대응
    // 🏆 [신규] 금일 기수/조교사 성적 집계 (트로피용) - 누적 방식 (해당 경주 이전+현재 결과까지)
    const winStatsToday = React.useMemo(() => {
        const stats = { jockeys: {}, trainers: {} };
        if (!dbData?.locations?.[loc]?.races) return stats;

        const prefix = `${date}_${loc}_`;
        const currentRaceNo = raceIdx + 1;
        
        // 1. Manual Results
        const allResults = { ...raceResults };
        
        // 2. Override with current realtime data for current race
        if (realtimeResults && realtimeResults.winners) {
            allResults[`${prefix}${currentRaceNo}`] = realtimeResults.winners;
        }

        Object.entries(allResults).forEach(([key, resArr]) => {
            if (!key.startsWith(prefix) || !Array.isArray(resArr)) return;

            const rNo = Number(key.split('_').pop());
            // Filter removed: all trophies for the day are accumulated regardless of current raceIdx

            const raceData = dbData?.locations?.[loc]?.races?.find(r => Number(r.race_no) === rNo);
            if (!raceData) return;

            resArr.forEach((horseNo, idx) => {
                const rank = idx + 1;
                if (!horseNo) return;
                
                const horse = raceData.horses.find(h => Number(h.horse_no) === Number(horseNo));
                if (!horse) return;

                if (horse.jockey) {
                    const jName = normalizeName(horse.jockey);
                    if (!stats.jockeys[jName]) stats.jockeys[jName] = { 1: 0, 2: 0, 3: 0 };
                    stats.jockeys[jName][rank]++;
                }
                if (horse.trainer) {
                    const tName = normalizeName(horse.trainer);
                    if (!stats.trainers[tName]) stats.trainers[tName] = { 1: 0, 2: 0, 3: 0 };
                    stats.trainers[tName][rank]++;
                }
            });
        });
        return stats;
    }, [raceResults, realtimeResults, date, loc, dbData]);

    const TrophyBadge = ({ rank, count }) => {
        if (!count || count <= 0) return null;
        const emojis = { 1: "🥇", 2: "🥈", 3: "🥉" };
        
        return (
            <div className="flex items-center gap-0.5 animate-fade-in">
                <span className="text-sm">{emojis[rank]}</span>
                {count > 1 && (
                    <span className="text-[10px] font-black text-slate-500 -ml-0.5 mt-1 opacity-80">
                        {count}
                    </span>
                )}
            </div>
        );
    };

    // 지역 변경 시 인덱스 초기화
    const changeLocation = (newLoc) => {
        setLoc(newLoc);
        setRaceIdx(0);
        setExpanded(null);
        setSubTab('records');
    };

    // 0. State Persistence (localStorage) - 새로고침 시 마지막 상태 유지
    useEffect(() => {
        localStorage.setItem('race_last_date', date);
        localStorage.setItem('race_last_loc', loc);
        localStorage.setItem('race_last_idx', raceIdx.toString());
        localStorage.setItem('race_last_game_idx', activeGameIdx.toString());
    }, [date, loc, raceIdx, activeGameIdx]);

    // 1. Firebase Authentication & Initial Setup
    useEffect(() => {
        const interval = setInterval(async () => {
            if (window.fb && window.fb.isReady) {
                clearInterval(interval);
                const { auth, onAuthStateChanged, signInAnonymously } = window.fb;
                
                // 인증 상태 감시
                onAuthStateChanged(auth, u => {
                    setUser(u);
                    if (!u) {
                        // 로그아웃 상태면 일단 익명 로그인 시도 (기능 유지를 위해)
                        signInAnonymously(auth).catch(e => console.error("Anon auth error:", e));
                    }
                    setSyncStatus(u ? 'synced' : 'connecting');
                });
            }
        }, 100);
        return () => clearInterval(interval);
    }, []);

    const loginWithGoogle = async () => {
        if (!window.fb?.isReady) return;
        const { auth, googleProvider, signInWithPopup } = window.fb;
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (e) {
            if (e.code !== 'auth/popup-closed-by-user') {
                alert("로그인 중 오류가 발생했습니다: " + e.message);
            }
        }
    };

    const logout = async () => {
        if (!window.fb?.isReady) return;
        if (!confirm('로그아웃 하시겠습니까?')) return;
        const { auth, signOut } = window.fb;
        try {
            await signOut(auth);
        } catch (e) {
            alert("로그아웃 오류: " + e.message);
        }
    };

    // 2. Race Data Sync (depends on date)
    useEffect(() => {
        if (!user || !window.fb?.isReady || !date) return;
        const { db, doc, onSnapshot } = window.fb;
        const appId = 'race-app-3e41d';
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'raceDataJson', date);
        
        const unsub = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                setDbData(snap.data());
                setSyncStatus('synced');
            } else {
                setDbData(defaultData);
                setSyncStatus('no-data');
            }
        }, (err) => {
            console.error("Race data sync error:", err);
            setSyncStatus('error');
        });
        
        return () => unsub();
    }, [user, date]);

    // 3. Horse Notes Sync (Global)
    useEffect(() => {
        if (!user || !window.fb?.isReady) return;
        const { db, doc, onSnapshot } = window.fb;
        const notesRef = doc(db, 'artifacts', 'race-app-3e41d', 'public', 'horseNotesData');
        const resultsRef = doc(db, 'artifacts', 'race-app-3e41d', 'public', 'raceResultsData');
        
        onSnapshot(notesRef, (snap) => {
            if (snap.exists()) setHorseNotes(snap.data());
        }, (err) => console.error("Notes data sync error:", err));

        onSnapshot(resultsRef, (snap) => {
            if (snap.exists()) setRaceResults(snap.data());
        }, (err) => console.error("Results data sync error:", err));
    }, [user]);

    // 3.1 [수정] 실시간 데이터 연동 (결과 및 체중) - 날짜 형식 보정 (YYYYMMDD)
    useEffect(() => {
        if (!user || !window.fb?.isReady || !date || !loc) return;
        const { db, doc, onSnapshot } = window.fb;
        
        // 🔥 Crawler와 날짜 형식 통일 (2026-03-29 -> 20260329)
        const fbDate = date.replace(/-/g, '');
        if (!fbDate) return;
        
        // 1. Results Sync
        const resPath = `realtime/results/${fbDate}/${loc}/races/${raceIdx + 1}`;
        const resRef = doc(db, resPath);
        const unsubRes = onSnapshot(resRef, (snap) => {
            if (snap.exists()) setRealtimeResults(snap.data());
            else setRealtimeResults(null);
        }, (err) => console.error("Realtime Results sync error:", err));

        // 2. Weights Sync
        const weightPath = `realtime/weights/${fbDate}/${loc}/races/${raceIdx + 1}`;
        const weightRef = doc(db, weightPath);
        const unsubWeight = onSnapshot(weightRef, (snap) => {
            if (snap.exists()) setRealtimeWeights(snap.data());
            else setRealtimeWeights(null);
        }, (err) => console.error("Realtime Weights sync error:", err));

        return () => { unsubRes(); unsubWeight(); };
    }, [user, date, loc, raceIdx]);

    // 3.5 Local Selections Persistence (Save changes to local storage IMMEDIATELY)
    useEffect(() => {
        const pickPath = `picks_${date}_${loc}_${raceIdx + 1}`;
        
        // 중요: 현재 로드된 경주와 저장하려는 경로가 일치할 때만 로컬 저장 수행 (경주 이동 시 데이터 오염 방지)
        if (lastLoadedPath.current === pickPath && picksStatus !== 'loading') {
            localStorage.setItem(`local_${pickPath}`, JSON.stringify(betGames));
            localStorage.setItem(`local_memo_${pickPath}`, betMemo);
            
            // 수정됨 상태로 변경 (기존이 'synced' 또는 'local'일 때만)
            if (picksStatus === 'synced' || picksStatus === 'local') {
                // 실제 변경 사항이 있는지 심층 비교는 생략하고 상태만 업데이트 (편의성)
                // 만약 정확한 체크를 원하면 _.isEqual 같은 함수 필요
            }
        }
    }, [betGames, betMemo, date, loc, raceIdx]);

    const setModified = () => {
        if (picksStatus === 'synced' || picksStatus === 'local') setPicksStatus('modified');
    };

    // 4. My Picks Sync (CRITICAL FIX: depends on loc and raceIdx)
    useEffect(() => {
        if (!user || !window.fb?.isReady || !date) return;
        const { db, doc, onSnapshot } = window.fb;
        const appId = 'race-app-3e41d';
        const pickPath = `picks_${date}_${loc}_${raceIdx + 1}`;
        if (!pickPath) return;
        const picksDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'myPicks', pickPath);

        setPicksStatus('loading');
        lastLoadedPath.current = null; // 로딩 시작 시 경로 잠금

        const unsub = onSnapshot(picksDocRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.games) setBetGames(data.games);
                if (data.memo) setBetMemo(data.memo || '');
                setPicksStatus('synced');
            } else {
                const saved = localStorage.getItem(`local_${pickPath}`);
                if (saved) {
                    try { 
                        setBetGames(JSON.parse(saved)); 
                        setPicksStatus('local');
                    } catch (e) { setPicksStatus('none'); }
                } else {
                    setBetGames([
                        { id: 1, type: '단승', ranks: { 1: [], 2: [], 3: [] }, amount: 1000 },
                        { id: 2, type: '단승', ranks: { 1: [], 2: [], 3: [] }, amount: 1000 },
                        { id: 3, type: '단승', ranks: { 1: [], 2: [], 3: [] }, amount: 1000 }
                    ]);
                    setBetMemo('');
                    setPicksStatus('none');
                }
            }
            lastLoadedPath.current = pickPath; // 로드 완료 후 경로 잠금 해제
        }, (err) => {
            console.error("Picks data sync error:", err);
            setPicksStatus('error');
        });

        return () => unsub();
    }, [user, date, loc, raceIdx]);

    const resetAllBets = () => {
        if (isLocked) return;
        setBetGames([
            { id: 1, type: '단승', ranks: { 1: [], 2: [], 3: [] }, amount: 1000 },
            { id: 2, type: '단승', ranks: { 1: [], 2: [], 3: [] }, amount: 1000 },
            { id: 3, type: '단승', ranks: { 1: [], 2: [], 3: [] }, amount: 1000 },
        ]);
        setActiveGameIdx(0);
        setBetMemo('');
        setModified();
    };

    const toggleHorseSelection = (no, rank) => {
        if (isLocked) return;
        setBetGames(prev => {
            const next = [...prev];
            const g = { ...next[activeGameIdx] };
            const nextRanks = { ...g.ranks };

            // 1. 상호 배타적 선택: 다른 등급에서 해당 마필 제거
            [1, 2, 3].forEach(r => {
                if (r !== rank) nextRanks[r] = (nextRanks[r] || []).filter(h => h !== no);
            });

            // 2. 현재 등급 토글
            const currentArr = nextRanks[rank] || [];
            if (currentArr.includes(no)) {
                nextRanks[rank] = currentArr.filter(h => h !== no);
            } else {
                nextRanks[rank] = [...currentArr, no].sort((a, b) => a - b);
            }

            g.ranks = nextRanks;
            next[activeGameIdx] = g;
            setModified();
            return next;
        });
    };

    const toggleRaceResult = async (no) => {
        if (!user || user.isAnonymous) return alert('결과를 입력하려면 구글 계정으로 로그인해 주세요.');
        const resKey = `${date}_${loc}_${race?.race_no}`;
        const currentRes = raceResults[resKey] || [];
        
        let nextRes;
        if (currentRes.includes(no)) {
            nextRes = currentRes.filter(h => h !== no);
        } else {
            if (currentRes.length >= 3) return alert('이미 3위까지 입력되었습니다. 먼저 삭제 후 추가하세요.');
            nextRes = [...currentRes, no];
        }

        const { db, doc, setDoc } = window.fb;
        const resultsRef = doc(db, 'artifacts', 'race-app-3e41d', 'public', 'raceResultsData');
        try {
            await setDoc(resultsRef, { [resKey]: nextRes }, { merge: true });
        } catch (e) { alert("결과 저장 실패: " + e.message); }
    };

    // UI 동기화를 위해 selections가 변할 때 legacy selectedHorses(Rank 1) 업데이트
    useEffect(() => {
        const active = betGames[activeGameIdx];
        setSelectedHorses(active?.ranks?.[1] || []);
    }, [betGames, activeGameIdx]);

    const savePicks = async () => {
        if (!user || user.isAnonymous) return alert('배팅 조합을 저장하려면 구글 계정으로 로그인해 주세요.');
        if (!window.fb?.isReady) return alert('Firebase 초기화 대기 중...');
        const { db, doc, setDoc } = window.fb;
        const appId = 'race-app-3e41d';
        const pickPath = `picks_${date}_${loc}_${raceIdx + 1}`;
        
        // 로컬에 선저장
        localStorage.setItem(`local_${pickPath}`, JSON.stringify(betGames));
        localStorage.setItem(`local_memo_${pickPath}`, betMemo);

        try {
            await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'myPicks', pickPath), {
                games: betGames,
                memo: betMemo,
                updatedAt: new Date().toISOString()
            });
            setIsBetPanelOpen(false);
            setPicksStatus('synced');
            alert(`다중 슬롯 조합이 저장되었습니다.`);
        } catch (e) { alert("저장 실패: " + e.message); }
    };

    const saveHorseNote = async (horseName, noteText) => {
        if (!user || user.isAnonymous) return alert('메모를 작성하려면 구글 계정으로 로그인해 주세요.');
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
        if (!user || user.isAnonymous) return alert('메모를 삭제하려면 구글 계정으로 로그인해 주세요.');
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
        if (!user || user.isAnonymous) return alert('파일을 업로드하려면 구글 계정으로 로그인해 주세요.');
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const json = JSON.parse(ev.target.result);
                if (!json || !json.date) throw new Error("유효하지 않은 파일 형식입니다 (날짜 정보 없음).");
                
                // 🚨 실시간 동기화 파일(kra_sync) 등 불완전한 파일 업로드 방지
                const hasRaces = json.locations && Object.values(json.locations).some(loc => loc.races && Array.isArray(loc.races));
                if (!hasRaces) {
                    throw new Error("경주마 정보(races)가 없는 불완전한 파일입니다. 메인 DB 파일 (Merged_Race_Data_*.json)을 업로드해주세요.");
                }
                
                const dateMatch = String(json.date).match(/(\d{4}-\d{2}-\d{2})/);
                const targetDate = dateMatch ? dateMatch[1] : date;
                
                // 🚨 실시간 상태 초기화
                setRealtimeResults(null); 
                setRealtimeWeights(null);
                setDbData(json);
                setRaceIdx(0); // 🚨 [필수] 인덱스 초기화
                
                setDate(targetDate);
                
                if (user && !user.isAnonymous) {
                    const { db, doc, setDoc } = window.fb;
                    const docRef = doc(db, 'artifacts', 'race-app-3e41d', 'public', 'data', 'raceDataJson', targetDate);
                    await setDoc(docRef, { ...json, lastUpdated: new Date().toISOString() });
                    setSyncStatus('synced');
                }
            } catch (err) { 
                console.error("Upload error:", err);
                alert("파일 로드 실패: " + err.message); 
            }
        };
        reader.readAsText(file);
    };

    const currentLocData = dbData?.locations?.[loc] || { location_name: loc === 'seoul' ? "서울" : "부산", races: [] };
    const races = currentLocData.races || [];
    const race = races[raceIdx];
    const expert = race?.expert_opinion;
    const stats = race?.stats_analysis;
    const info = race?.race_info;

    // 🔒 출발시간 마감 로직 (출발 0분 후 마감)
    const isLocked = (() => {
        if (!info?.start_time || !date) return false;
        try {
            const [hours, minutes] = info.start_time.split(':').map(Number);
            const raceDate = new Date(date);
            raceDate.setHours(hours, minutes, 0, 0);
            const lockTime = new Date(raceDate.getTime());
            return new Date() > lockTime;
        } catch (e) { return false; }
    })();

    // 🏆 결과 입력 가능 로직 (출발 3분 후 가능)
    const isResultEntryPossible = (() => {
        if (!info?.start_time || !date) return false;
        try {
            const [hours, minutes] = info.start_time.split(':').map(Number);
            const raceDate = new Date(date);
            raceDate.setHours(hours, minutes, 0, 0);
            const possibleTime = new Date(raceDate.getTime() + 3 * 60 * 1000);
            return new Date() > possibleTime;
        } catch (e) { return false; }
    })();

    const resultKey = `${date}_${loc}_${race?.race_no}`;
    const results = raceResults[resultKey] || [];

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

        const targetDistNum = info && info.distance ? parseInt(String(info.distance).replace(/\D/g, '')) : 0;
        
        // 🚨 [필수] race 또는 horses가 없을 경우 대비 가드 (파일 업로드 직후 등)
        const horsePerformance = (race && race.horses) ? race.horses.map(h => {
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
        }) : [];

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

    // 기수별 당일 기승 스케줄 계산
    const jockeyRidesMap = React.useMemo(() => {
        const map = {};
        if (!currentLocData || !currentLocData.races) return map;
        currentLocData.races.forEach(r => {
            r.horses?.forEach(h => {
                if (!h.jockey) return;
                const jName = (h.jockey || '').replace(/[^가-힣]/g, ''); // 이름만 추출
                if (!map[jName]) map[jName] = [];
                if (!map[jName].includes(r.race_no)) {
                    map[jName].push(r.race_no);
                }
            });
        });
        Object.keys(map).forEach(j => map[j].sort((a, b) => a - b));
        return map;
    }, [currentLocData]);

    const trainerEntriesMap = React.useMemo(() => {
        const map = {};
        if (!currentLocData || !currentLocData.races) return map;
        currentLocData.races.forEach(r => {
            r.horses?.forEach(h => {
                if (!h.trainer) return;
                const tName = h.trainer;
                if (!map[tName]) map[tName] = [];
                map[tName].push({ race_no: r.race_no, horse_no: h.horse_no });
            });
        });
        Object.keys(map).forEach(t => {
            map[t].sort((a, b) => a.race_no - b.race_no || a.horse_no - b.horse_no);
        });
        return map;
    }, [currentLocData]);

    return (
        <div className="max-w-md mx-auto min-h-screen flex flex-col bg-[#f8fafc] relative shadow-2xl font-sans">
            <header className="bg-slate-900 text-white pt-6 pb-6 px-6 rounded-b-[30px] shadow-xl z-20 relative">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <div className="bg-yellow-400 p-1.5 rounded-lg text-slate-900"><Icon name="trophy" size={16} /></div>
                        <span className="font-black italic text-lg tracking-tighter">SMART<span className="text-yellow-400">RACING</span> V10</span>
                        
                        {user && !user.isAnonymous ? (
                            <button 
                                onClick={logout}
                                className="group relative flex items-center justify-center animate-fade-in ml-1"
                                title="로그아웃 하시겠습니까?"
                            >
                                <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <img src={user.photoURL} className="w-7 h-7 rounded-full ring-2 ring-slate-700 group-hover:ring-yellow-400 shadow-lg transition-all relative z-10" alt="Profile" />
                                <div className="absolute -top-1 -right-1 bg-rose-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-sm border border-white/20">
                                    <Icon name="log-out" size={8} />
                                </div>
                            </button>
                        ) : (
                            <button 
                                onClick={loginWithGoogle}
                                className="w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 hover:border-indigo-400 hover:bg-slate-700 transition-all shadow-lg group ml-1"
                                title="구글 로그인"
                            >
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" alt="G" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => dateInputRef.current?.showPicker()}
                            className="relative flex items-center bg-slate-800 text-white text-[11px] font-black px-3 py-1.5 rounded-xl border border-slate-700/50 hover:border-yellow-400/50 transition-all shadow-lg group overflow-hidden"
                        >
                            <span className="flex items-center gap-1.5">
                                {formatDisplayDate(date)}
                                <Icon name="calendar" size={12} className="text-yellow-400 opacity-80 group-hover:scale-110 transition-transform" />
                            </span>
                            <input 
                                type="date"
                                ref={dateInputRef}
                                value={date} 
                                onChange={(e) => setDate(e.target.value)} 
                                className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0" 
                            />
                        </button>
                        {user && !user.isAnonymous && (
                            <button onClick={() => setViewMode(viewMode === 'app' ? 'admin' : 'app')} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${viewMode === 'admin' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}><Icon name={viewMode === 'app' ? 'settings' : 'x'} size={14} /></button>
                        )}
                    </div>
                </div>
                {viewMode === 'app' && (
                    <>
                        <div className="flex justify-between items-end">
                            <div>
                                <div className="text-[11px] text-slate-400 font-medium mb-1 flex items-center gap-1 opacity-80 animate-in fade-in duration-500"><Icon name="calendar" size={12} /> {formatDisplayDate(dbData.date || date)}</div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <h2 className="text-2xl font-black text-white italic tracking-tight">{currentLocData.location_name} {race?.race_no}<span className="text-lg font-bold text-slate-400 not-italic ml-1">경주</span></h2>
                                    </div>
                                    {isResultEntryPossible && user && !user.isAnonymous && (
                                        <button 
                                            onClick={() => setIsResultEditMode(!isResultEditMode)} 
                                            className={`ml-1 flex items-center gap-1.5 px-2 py-1 rounded-lg border-2 transition-all active:scale-95 ${isResultEditMode ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                        >
                                            <Icon name={isResultEditMode ? "check-circle" : "edit-2"} size={12} />
                                            <span className="text-[10px] font-black">{isResultEditMode ? "입력완료" : "결과입력"}</span>
                                        </button>
                                    )}
                                    <div className="flex items-center gap-2 ml-2">
                                        <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700 shadow-inner">
                                            <button onClick={() => changeLocation('seoul')} className={`px-2.5 py-1.5 rounded-md text-[10px] font-black transition-all ${loc === 'seoul' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}>서울</button>
                                            <button onClick={() => changeLocation('busan')} className={`px-2.5 py-1.5 rounded-md text-[10px] font-black transition-all ${loc === 'busan' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50' : 'text-slate-400'}`}>부산</button>
                                        </div>
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
                                        <div className="flex items-center gap-3">
                                            {(() => {
                                                // 🥇 결과 우선순위: 수동 입력(배팅용) > 크롤링 데이터(자동)
                                                const displayedResults = (results && results.length > 0) 
                                                    ? results 
                                                    : (realtimeResults && realtimeResults.winners) 
                                                        ? realtimeResults.winners 
                                                        : [];
                                                
                                                if (displayedResults.length === 0) return null;
                                                
                                                return (
                                                    <div className="flex items-center gap-1.5 pr-3 border-r border-slate-200">
                                                        {displayedResults.slice(0, 3).map((no, rIdx) => (
                                                            <div key={rIdx} className="flex flex-col items-center gap-0.5">
                                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter leading-none">{rIdx === 0 ? '1st' : rIdx === 1 ? '2nd' : '3rd'}</span>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); if(isResultEditMode) toggleRaceResult(no); }}
                                                                    className={`w-7 h-7 rounded-lg font-black text-sm flex items-center justify-center shadow-sm transition-all ${isResultEditMode ? 'hover:scale-110 active:bg-red-500 active:text-white' : 'pointer-events-none'} ${getBadgeStyle(no)}`}
                                                                >
                                                                    {no}
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">우승마 평균기록</span>
                                                <div className="font-black text-slate-800 text-sm tabular flex items-center gap-1"><Icon name="timer" size={14} className="text-indigo-500" />{stats?.avg_record || '-'}</div>
                                            </div>
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
                                    <button 
                                        onClick={() => setIsSimOpen(!isSimOpen)}
                                        className={`w-full mt-2 py-1.5 flex items-center justify-center gap-2 border-t border-slate-100 hover:bg-slate-50 transition-all active:bg-slate-100 rounded-b-3xl -mx-4 w-[calc(100%+32px)] group transition-all duration-300`}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-[10px] font-black tracking-tighter ${isSimOpen ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                                {isSimOpen ? "분석 보드 닫기" : "AI 몬테카를로 분석 보기"}
                                            </span>
                                            <Icon 
                                                name={isSimOpen ? "chevron-up" : "chevron-down"} 
                                                size={12} 
                                                className={`transition-transform duration-300 ${isSimOpen ? 'text-indigo-500' : 'text-slate-300 group-hover:translate-y-0.5'}`} 
                                            />
                                        </div>
                                    </button>
                                </div>

                            </div>
                        )}

                        {/* AI 시뮬레이션 존 (신규 엔진 통합, 토글 상태 반영) */}
                        {isSimOpen && (
                            <div className="px-4 mb-6">
                                <SimulationZone 
                                    race={race} 
                                    info={info} 
                                    loc={loc} 
                                    trackInfo={trackInfo}
                                    statsAnalysis={race?.stats_analysis}
                                    sireInfo={Object.values(sireMap)}
                                    user={user}
                                />
                            </div>
                        )}

                        <div className="px-4 space-y-3">
                            {race?.horses?.map((h, i) => {
                                const isExp = expanded === h.horse_no;
                                const isSelected = selectedHorses.includes(h.horse_no);
                                const picksText = expert?.picks_text?.find(p => parseInt(p.no) === h.horse_no)?.coment;
                                const isPick = expert?.picks?.includes(h.horse_no);
                                const targetDist = info && info.distance ? parseInt(String(info.distance).replace(/\D/g, '')) : 0;
                                const recentRecObj = h.recent_history?.find(r => r.distance === targetDist);
                                const recentRecord = recentRecObj ? recentRecObj.record : null;
                                const myWeight = getNum(h.weight);

                                const badges = [];

                                // 최근 4경기 착순 배지 데이터 준비
                                const rankBadges = [];
                                if (h.recent_history) {
                                    h.recent_history.slice(0, 4).forEach(hist => {
                                        const isSameDist = info && info.distance && parseInt(String(info.distance).replace(/\D/g, '')) === parseInt(hist.distance?.toString().replace(/\D/g, ''));
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
                                if (h.total_subbo_cnt > 0) badges.push({ emoji: "⚡", text: `습보 ${h.total_subbo_cnt}`, color: "red" });
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
                                    <div key={h.horse_no} className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden animate-up relative ${isExp ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-100'} ${isResultEditMode && results.includes(h.horse_no) ? 'ring-2 ring-indigo-600 ring-offset-2' : ''}`} style={{ animationDelay: `${0.2 + (i * 0.05)}s` }}>
                                        <div className="p-3 flex items-stretch cursor-pointer" onClick={() => {
                                            if (isResultEditMode) {
                                                toggleRaceResult(h.horse_no);
                                            } else if (expanded === h.horse_no) {
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
                                                        <div className="flex items-center gap-1.5 mb-1 text-yellow-400 font-black text-[10px] uppercase">
                                                            <Icon name="info" size={10} />
                                                            {hoveredEq.text}
                                                        </div>
                                                        <div className="text-[10px] leading-tight font-medium text-slate-100">
                                                            {hoveredEq.desc}
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex items-start gap-2.5 mb-2.5">
                                                    {/* 🔢 좌측: 마번 + 체중 수직 스택 (밀도 조절) */}
                                                    <div className="flex flex-col items-center shrink-0 w-[46px] gap-1 mt-0.5">
                                                        <div className={`w-[40px] h-[40px] rounded-xl flex items-center justify-center font-black text-lg italic tracking-tighter shadow-sm border ${getBadgeStyle(h.horse_no)}`}>
                                                            {h.horse_no}
                                                        </div>
                                                        {(() => {
                                                            const rtObj = realtimeWeights?.[h.horse_no];
                                                            if (!rtObj || !rtObj.weight) return null;
                                                            const diff = Number(rtObj.change) || 0;
                                                            return (
                                                                <div className="text-slate-600 text-[10px] text-center whitespace-nowrap animate-fade-in tabular-nums tracking-tighter">
                                                                    {rtObj.weight}
                                                                    <span className={`${Math.abs(diff) >= 10 ? 'text-rose-600 font-bold' : 'opacity-70'} ml-0.5`}>
                                                                        ({diff > 0 ? `+${diff}` : diff})
                                                                    </span>
                                                                    <span className="text-[8px] opacity-40 ml-0.5 font-medium">kg</span>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>

                                                    {/* 📝 우측: 마명 + 기수 + 조교사 (3줄 텍스트 레이아웃) */}
                                                    <div className="flex flex-col flex-1 min-w-0 py-0.5 h-[58px] justify-between">
                                                        {/* Line 1: 마명 & 등급 */}
                                                        <div className="flex items-center gap-1.5 line-clamp-1">
                                                            <h3 className="font-black text-slate-900 text-[14px] truncate leading-tight tracking-tight">{h.name}</h3>
                                                            <span className="text-[9px] text-slate-500 font-bold bg-slate-100 px-1 py-0.5 rounded-md shrink-0 border border-slate-200/50">{h.grade}</span>
                                                        </div>

                                                        {/* Line 2: 기수 정보 */}
                                                        <div className="flex items-center gap-1.5 text-[10px] truncate leading-none">
                                                            <span className="text-slate-400 font-medium shrink-0">{h.origin}/{h.sex}/{h.age}</span>
                                                            <span className="text-indigo-600 font-black flex items-center gap-0.5 truncate">
                                                                <Icon name="user" size={10} />
                                                                {h.jockey}
                                                                {(() => {
                                                                    const stats = winStatsToday?.jockeys?.[normalizeName(h.jockey)];
                                                                    if (!stats) return "";
                                                                    return (
                                                                        <span className="ml-1 tracking-[-2.5px] opacity-90 scale-90 inline-block">
                                                                            {"🥇".repeat(stats[1] || 0)}{"🥈".repeat(stats[2] || 0)}{"🥉".repeat(stats[3] || 0)}
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </span>
                                                        </div>

                                                        {/* Line 3: 조교사 & 마주 */}
                                                        <div className="text-[9px] text-slate-500 truncate leading-none flex items-center gap-1 font-medium italic">
                                                            <span className={`${race?.horses?.filter(horse => horse.trainer === h.trainer).length > 1 ? 'text-rose-600 font-bold' : ''}`}>
                                                                {h.trainer}
                                                                {(() => {
                                                                    const stats = winStatsToday?.trainers?.[normalizeName(h.trainer)];
                                                                    if (!stats) return "";
                                                                    return (
                                                                        <span className="ml-0.5 tracking-[-2.5px] opacity-90 scale-85 inline-block">
                                                                            {"🥇".repeat(stats[1] || 0)}{"🥈".repeat(stats[2] || 0)}{"🥉".repeat(stats[3] || 0)}
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </span>
                                                            <span className="text-slate-300">/</span>
                                                            <span className="truncate">
                                                                {h.owner}
                                                            </span>
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
                                                            {h.training_cnt || '-'}{h.jockey_training_cnt > 0 ? `(${h.jockey_training_cnt})` : ''}회
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
                                                {/* 최근 1개월 승률 배지 추가 */}
                                                {(() => {
                                                    const jWin = h.jockey_stats?.recent_stats?.win_rate;
                                                    const tWin = h.trainer_stats?.recent_stats?.win_rate;
                                                    const wrBadges = [];
                                                    if (jWin !== undefined && jWin !== "") {
                                                        const rate = parseFloat(jWin);
                                                        const color = rate >= 15 ? 'bg-red-600 text-white' : rate >= 10 ? 'bg-orange-500 text-white' : 'bg-slate-500 text-white';
                                                        wrBadges.push({ text: `기${jWin}%`, class: color });
                                                    }
                                                    if (tWin !== undefined && tWin !== "") {
                                                        const rate = parseFloat(tWin);
                                                        const color = rate >= 15 ? 'bg-red-600 text-white' : rate >= 10 ? 'bg-orange-500 text-white' : 'bg-slate-500 text-white';
                                                        wrBadges.push({ text: `조${tWin}%`, class: color });
                                                    }
                                                    return wrBadges.map((b, i) => (
                                                        <div key={`wr-${i}`} className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black shadow-sm ${b.class}`}>
                                                            {b.text}
                                                        </div>
                                                    ));
                                                })()}

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
                                                {(() => {
                                                    const sData = sireMap[h.sire] || Object.values(sireMap).find(s => s.en?.toLowerCase() === h.sire?.toLowerCase());
                                                    return sData ? (
                                                        <div className="bg-indigo-50 text-indigo-600 border-indigo-100 px-2 py-0.5 rounded text-[10px] font-black border flex items-center gap-1 shadow-sm">
                                                            <Icon name="database" size={10} />
                                                            <span>부마분석</span>
                                                        </div>
                                                    ) : null;
                                                })()}
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

                                                {/* 첫 번째 줄: 관계자 정보 */}
                                                <div className="flex gap-1.5 mb-2 p-1 bg-slate-100 rounded-xl w-full border border-slate-200">
                                                    {[
                                                        {
                                                            id: 'jockey', label: (() => {
                                                                const jName = (h.jockey || '').replace(/[^가-힣]/g, '');
                                                                const rides = jockeyRidesMap[jName];
                                                                const idx = rides ? rides.indexOf(race.race_no) + 1 : 0;
                                                                return `${jName}${rides ? `(${idx}/${rides.length})` : ''}`;
                                                            })(), icon: 'user'
                                                        },
                                                        {
                                                            id: 'trainer', label: (() => {
                                                                const entries = trainerEntriesMap[h.trainer];
                                                                const idx = entries ? entries.findIndex(e => e.race_no === race.race_no && e.horse_no === h.horse_no) + 1 : 0;
                                                                return `${h.trainer}${entries ? `(${idx}/${entries.length})` : ''}`;
                                                            })(), icon: 'briefcase'
                                                        },
                                                        { id: 'sire', label: `${h.sire || '-'}`, icon: 'database' }
                                                    ].map(tab => (
                                                        <button
                                                            key={tab.id}
                                                            onClick={(e) => { e.stopPropagation(); setSubTab(tab.id); }}
                                                            className={`flex-1 flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-lg text-[10px] font-black transition-all shadow-sm ${subTab === tab.id ? 'bg-white text-indigo-600 ring-2 ring-indigo-500/20' : 'text-slate-500 hover:text-slate-700 bg-white/50 border border-slate-200/50'}`}
                                                        >
                                                            <Icon name={tab.icon} size={11} />
                                                            <span className="truncate w-full text-center leading-tight">{tab.label}</span>
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* 두 번째 줄: 상세 데이터 */}
                                                <div className="flex gap-1 mb-4 p-1 bg-slate-100 rounded-xl w-full border border-slate-200">
                                                    {[
                                                        { id: 'records', label: '최근기록', icon: 'list' },
                                                        { id: 'training', label: '조교현황', icon: 'zap' },
                                                        { id: 'judicial', label: '심판리포트', icon: 'alert-circle' },
                                                        { id: 'medical', label: '진료사항', icon: 'plus-square' },
                                                        { id: 'special', label: '특이사항', icon: 'file-text' }
                                                    ].map(tab => (
                                                        <button
                                                            key={tab.id}
                                                            onClick={(e) => { e.stopPropagation(); setSubTab(tab.id); }}
                                                            className={`flex-1 flex flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 rounded-lg text-[9px] font-black transition-all shadow-sm ${subTab === tab.id ? 'bg-white text-indigo-600 ring-2 ring-indigo-500/20' : 'text-slate-500 hover:text-slate-700 bg-white/50 border border-slate-200/50'}`}
                                                        >
                                                            <Icon name={tab.icon} size={11} />
                                                            <span className="truncate w-full text-center leading-tight">{tab.label}</span>
                                                            <div className="flex gap-0.5 mt-0.5">
                                                                {tab.id === 'judicial' && h.steward_trip_note && <span className="w-1 h-1 bg-orange-400 rounded-full"></span>}
                                                                {tab.id === 'medical' && h.medical_alerts?.length > 0 && <span className="w-1 h-1 bg-red-400 rounded-full"></span>}
                                                                {tab.id === 'special' && (h.special_note || horseNotes[h.name]) && <span className="w-1 h-1 bg-indigo-400 rounded-full"></span>}
                                                            </div>
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

                                                {subTab === 'jockey' && (
                                                    <div className="space-y-3">
                                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm bg-gradient-to-br from-white to-indigo-50/30">
                                                            <div className="flex items-center justify-between mb-3 border-b border-indigo-100 pb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <Icon name="user" size={14} className="text-indigo-600" />
                                                                    <span className="text-xs font-black text-slate-800">기수 성적: {h.jockey}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
                                                                        {(() => {
                                                                            const jName = normalizeName(h.jockey);
                                                                            const rides = jockeyRidesMap[jName];
                                                                            if (!rides || rides.length === 0) return null;
                                                                            const uniqueRides = [...new Set(rides)];
                                                                            
                                                                            return (
                                                                                <div className="flex flex-wrap gap-1 items-center">
                                                                                    {uniqueRides.map((rNo, ridx) => {
                                                                                        const res = raceResults[`${date}_${loc}_${rNo}`] || realtimeResults?.[`${date}_${loc}_${rNo}`]?.winners;
                                                                                        let emoji = "";
                                                                                        if (res) {
                                                                                            const rData = currentLocData.races.find(r => Number(r.race_no) === Number(rNo));
                                                                                            const horseInRace = rData?.horses.find(bh => normalizeName(bh.jockey) === jName);
                                                                                            if (horseInRace) {
                                                                                                const rank = res.indexOf(Number(horseInRace.horse_no)) + 1;
                                                                                                if (rank >= 1 && rank <= 3) emoji = ["🥇", "🥈", "🥉"][rank - 1];
                                                                                            }
                                                                                        }
                                                                                        return (
                                                                                            <span key={ridx} className="text-[10px] text-indigo-500 font-black bg-white px-1.5 py-0.5 rounded border border-indigo-100 shadow-sm flex items-center justify-center min-w-[24px]">
                                                                                                {rNo}{emoji}
                                                                                            </span>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                    <span className="text-[10px] bg-indigo-600 text-white px-2.5 py-1 rounded-full font-black shadow-md shadow-indigo-100 shrink-0 ml-auto self-start mt-1">
                                                                        오늘 {(() => {
                                                                            const jName = normalizeName(h.jockey);
                                                                            const rides = jockeyRidesMap[jName];
                                                                            return rides ? rides.length : 0;
                                                                        })()}회 기승
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {h.jockey_stats && h.jockey_stats.career ? (
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-2">
                                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">통산 전적</div>
                                                                        <div className="flex justify-between items-end">
                                                                            <span className="text-xl font-black text-slate-900">{h.jockey_stats.career.win_rate}<span className="text-xs font-medium ml-0.5 text-slate-400">%</span></span>
                                                                            <span className="text-[10px] text-slate-400 font-medium mb-1">{h.jockey_stats.career.total_runs}전</span>
                                                                        </div>
                                                                        <div className="text-[9px] text-slate-500 font-medium">1착 {h.jockey_stats.career.wins} / 2착 {h.jockey_stats.career.seconds} / 3착 {h.jockey_stats.career.thirds}</div>
                                                                    </div>
                                                                    <div className="space-y-2 border-l border-slate-100 pl-4">
                                                                        <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">최근 1개월</div>
                                                                        {h.jockey_stats.recent_stats ? (
                                                                            <>
                                                                                <div className="flex justify-between items-end">
                                                                                    <span className="text-xl font-black text-indigo-600">{h.jockey_stats.recent_stats.win_rate}<span className="text-[10px] font-medium ml-0.5 text-indigo-300">%</span></span>
                                                                                    <span className="text-[10px] text-slate-400 font-medium mb-1">{h.jockey_stats.recent_stats.runs}전</span>
                                                                                </div>
                                                                                <div className="text-[9px] text-slate-500 font-medium">1착 {h.jockey_stats.recent_stats.wins} / 2착 {h.jockey_stats.recent_stats.seconds} / 3착 {h.jockey_stats.recent_stats.thirds}</div>
                                                                            </>
                                                                        ) : <div className="text-[10px] text-slate-300">최근 기록 없음</div>}
                                                                    </div>
                                                                </div>
                                                            ) : <div className="text-xs text-slate-400 p-2 text-center">기수 통계 정보가 없습니다.</div>}
                                                        </div>
                                                    </div>
                                                )}

                                                {subTab === 'trainer' && (
                                                    <div className="space-y-3">
                                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
                                                            <div className="flex items-center justify-between mb-3 border-b border-emerald-100 pb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <Icon name="briefcase" size={14} className="text-emerald-600" />
                                                                    <span className="text-xs font-black text-slate-800">
                                                                        조교사 성적: {h.trainer}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex flex-wrap items-center gap-1.5 py-1">
                                                                        {(() => {
                                                                            const tName = normalizeName(h.trainer);
                                                                            const entries = trainerEntriesMap[h.trainer];
                                                                            if (!entries || entries.length === 0) return null;
                                                                            const rNos = [...new Set(entries.map(e => Number(e.race_no)))].sort((a, b) => a - b);

                                                                            return (
                                                                                <div className="flex flex-wrap gap-1 items-center">
                                                                                    {rNos.map((rNo, ridx) => {
                                                                                        const res = raceResults[`${date}_${loc}_${rNo}`];
                                                                                        let emoji = "";
                                                                                        if (res && rNo <= raceIdx + 1) {
                                                                                            const rData = currentLocData.races.find(r => Number(r.race_no) === Number(rNo));
                                                                                            const horsesInRace = rData?.horses.filter(bh => normalizeName(bh.trainer) === tName) || [];
                                                                                            emoji = horsesInRace.map(bh => {
                                                                                                const rank = res.indexOf(Number(bh.horse_no)) + 1;
                                                                                                return (rank >= 1 && rank <= 3) ? ["🥇", "🥈", "🥉"][rank - 1] : "";
                                                                                            }).join("");
                                                                                        }
                                                                                        return (
                                                                                            <span key={ridx} className="text-[10px] text-emerald-500 font-black bg-white px-1.5 py-0.5 rounded border border-emerald-100 shadow-sm flex items-center justify-center min-w-[24px]">
                                                                                                {rNo}{emoji}
                                                                                            </span>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                    <span className="text-[10px] bg-emerald-600 text-white px-2.5 py-1 rounded-full font-black shadow-md shadow-emerald-100 shrink-0 ml-auto self-start mt-1">
                                                                        오늘 {(() => {
                                                                            const ent = trainerEntriesMap[h.trainer];
                                                                            return ent ? ent.length : 0;
                                                                        })()}두 출전
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {h.trainer_stats && h.trainer_stats.career ? (
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-2">
                                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">통산 전적</div>
                                                                        <div className="flex justify-between items-end">
                                                                            <span className="text-xl font-black text-slate-900">{h.trainer_stats.career.win_rate}<span className="text-xs font-medium ml-0.5 text-slate-400">%</span></span>
                                                                            <span className="text-[10px] text-slate-400 font-medium mb-1">{h.trainer_stats.career.total_runs}전</span>
                                                                        </div>
                                                                        <div className="text-[9px] text-slate-500 font-medium">1착 {h.trainer_stats.career.wins} / 2착 {h.trainer_stats.career.seconds}</div>
                                                                    </div>
                                                                    <div className="space-y-2 border-l border-slate-100 pl-4">
                                                                        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">최근 1개월</div>
                                                                        {h.trainer_stats.recent_stats ? (
                                                                            <>
                                                                                <div className="flex justify-between items-end">
                                                                                    <span className="text-xl font-black text-emerald-600">{h.trainer_stats.recent_stats.win_rate}<span className="text-xs font-medium ml-0.5 text-emerald-300">%</span></span>
                                                                                    <span className="text-[10px] text-slate-400 font-medium mb-1">{h.trainer_stats.recent_stats.runs}전</span>
                                                                                </div>
                                                                                <div className="text-[9px] text-slate-500 font-medium">1착 {h.trainer_stats.recent_stats.wins} / 2착 {h.trainer_stats.recent_stats.seconds} / 3착 {h.trainer_stats.recent_stats.thirds}</div>
                                                                            </>
                                                                        ) : <div className="text-[10px] text-slate-300">최근 기록 없음</div>}
                                                                    </div>
                                                                </div>
                                                            ) : <div className="text-xs text-slate-400 p-2 text-center">조교사 통계 정보가 없습니다.</div>}
                                                        </div>
                                                    </div>
                                                )}

                                                {subTab === 'sire' && (
                                                    <div className="space-y-4 animate-fade-in text-sm mb-6">
                                                        {(() => {
                                                            const sData = sireMap[h.sire] || Object.values(sireMap).find(s => s.en?.toLowerCase() === h.sire?.toLowerCase());
                                                            if (sData) {
                                                                return (
                                                                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                                                        {/* Header Section */}
                                                                        <div className="bg-slate-900 text-white p-6 relative overflow-hidden">
                                                                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                                                                            <div className="relative z-10">
                                                                                <div className="flex justify-between items-start">
                                                                                    <div>
                                                                                        <div className="flex items-center gap-2 mb-1">
                                                                                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded uppercase tracking-widest border border-blue-500/30">Sire Analysis</span>
                                                                                        </div>
                                                                                        <h3 className="text-2xl font-black flex items-center gap-3">
                                                                                            {sData.kr}
                                                                                            <span className="text-slate-500 text-sm font-medium uppercase tracking-tighter">{sData.en}</span>
                                                                                        </h3>
                                                                                    </div>
                                                                                    <div className="flex flex-col items-end gap-2">
                                                                                        <span className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-bold text-slate-300 border border-slate-700">
                                                                                            Origin: {sData.origin}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="mt-6 grid grid-cols-3 gap-3">
                                                                                    <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                                                                                        <p className="text-[10px] text-slate-500 uppercase font-black mb-1 tracking-wider">거리 적성</p>
                                                                                        <p className="font-black text-amber-500 text-sm">{sData.distance}</p>
                                                                                    </div>
                                                                                    <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                                                                                        <p className="text-[10px] text-slate-500 uppercase font-black mb-1 tracking-wider">성장 타입</p>
                                                                                        <p className="font-black text-emerald-500 text-sm">{sData.growth}</p>
                                                                                    </div>
                                                                                    <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                                                                                        <p className="text-[10px] text-slate-500 uppercase font-black mb-1 tracking-wider">주요 주로</p>
                                                                                        <p className="font-black text-blue-400 text-sm">{sData.track}</p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Content Section */}
                                                                        <div className="p-6 bg-slate-50/30">
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                                {/* Stats Grid */}
                                                                                <div className="space-y-4">
                                                                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                                                                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                                                                        자마 유전적 특징 발현율
                                                                                    </h4>
                                                                                    <div className="space-y-4">
                                                                                        {[
                                                                                            { label: '스피드(Speed)', val: sData.stats[0], color: 'bg-blue-500' },
                                                                                            { label: '스태미나(Stamina)', val: sData.stats[1], color: 'bg-indigo-500' },
                                                                                            { label: '파워(Power)', val: sData.stats[2], color: 'bg-emerald-500' },
                                                                                            { label: '조숙성(Precocity)', val: sData.stats[3], color: 'bg-amber-500' },
                                                                                            { label: '기질/투지(Temper)', val: sData.stats[4], color: 'bg-rose-500' }
                                                                                        ].map((stat, idx) => (
                                                                                            <div key={idx} className="group">
                                                                                                <div className="flex justify-between items-center mb-1.5 px-1">
                                                                                                    <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors uppercase tracking-tight">{stat.label}</span>
                                                                                                    <span className="font-black text-slate-900 text-xs">{stat.val}<span className="text-[10px] text-slate-400 font-medium ml-0.5">/ 10</span></span>
                                                                                                </div>
                                                                                                <div className="h-2 w-full bg-slate-200/50 rounded-full overflow-hidden shadow-inner p-[1px]">
                                                                                                    <div
                                                                                                        className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${stat.color} opacity-90`}
                                                                                                        style={{ width: `${stat.val * 10}%` }}
                                                                                                    ></div>
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>

                                                                                {/* Analysis Card */}
                                                                                <div className="flex flex-col">
                                                                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                                                                                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                                                                                        심층 혈통 분석 리포트
                                                                                    </h4>
                                                                                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex-grow flex flex-col justify-between">
                                                                                        <div>
                                                                                            <div className="flex items-center gap-2 mb-3">
                                                                                                <div className="p-2 bg-amber-50 rounded-lg">
                                                                                                    <Icon name="zap" size={16} className="text-amber-500" />
                                                                                                </div>
                                                                                                <span className="text-xs font-black text-slate-800 uppercase tracking-tighter">Core Insight</span>
                                                                                            </div>
                                                                                            <p className="text-slate-600 leading-relaxed text-[13px] font-medium italic">
                                                                                                "{sData.desc}"
                                                                                            </p>
                                                                                        </div>

                                                                                        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
                                                                                            <div>
                                                                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">OPTIMAL DISTANCE</p>
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                                                                                    <p className="text-sm font-black text-slate-900">{sData.bestAptitude}</p>
                                                                                                </div>
                                                                                            </div>
                                                                                            <Icon name="award" size={24} className="text-slate-200" />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            } else {
                                                                return (
                                                                    <div className="bg-slate-50 rounded-2xl p-12 text-center border border-dashed border-slate-200">
                                                                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                                                                            <Icon name="database" size={32} className="text-slate-300" />
                                                                        </div>
                                                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 leading-none">Database Status</div>
                                                                        <h3 className="text-xl font-black text-slate-900 mb-3">분석 데이터 로딩 중</h3>
                                                                        <p className="text-slate-500 max-w-sm mx-auto text-xs leading-relaxed font-medium">
                                                                            해당 경주마의 부마(<span className="text-slate-900 font-bold">{h.sire || '정보없음'}</span>)에 대한 상세 분석 데이터는 DB 등록 대기 중입니다.
                                                                            수동 데이터 연동을 진행해 주세요.
                                                                        </p>
                                                                    </div>
                                                                );
                                                            }
                                                        })()}
                                                    </div>
                                                )}

                                                {subTab === 'training' && (
                                                    <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
                                                        <table className="w-full text-[11px] text-center whitespace-nowrap">
                                                            <thead className="bg-slate-50 text-slate-400 border-b">
                                                                <tr>
                                                                    <th className="py-2 px-2 text-left pl-4">조교일자</th>
                                                                    <th>기승자</th>
                                                                    <th>조교시간</th>
                                                                    <th>걸음걸이</th>
                                                                    <th className="pr-4">수영조교</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y tabular">
                                                                {h.training_logs_detailed?.map((tw, twIdx) => (
                                                                    <tr key={twIdx} className="hover:bg-slate-50/50 transition-colors">
                                                                        <td className="py-2 px-2 pl-4 text-left text-slate-500 font-medium">{tw.date}</td>
                                                                        <td className="text-slate-700 font-bold">{tw.rider}</td>
                                                                        <td className="font-bold text-indigo-600">{tw.time}</td>
                                                                        <td className="text-slate-600">{tw.gait}</td>
                                                                        <td className="pr-4 text-blue-600 font-medium">{tw.swim !== '0' && tw.swim !== '' ? tw.swim : '-'}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                        {(!h.training_logs_detailed || h.training_logs_detailed.length === 0) && (
                                                            <div className="py-8 text-center text-slate-400 text-xs">조교 상세 데이터가 없습니다.</div>
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
                                                            h.medical_alerts?.map((med, mIdx) => (
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
                                                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm border-l-[3px] border-yellow-400">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[10px] font-black text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded">출전표 특이사항</span>
                                                                        <span className="text-[9px] text-slate-400 font-bold">(수정불가)</span>
                                                                    </div>
                                                                </div>
                                                                <p className="text-[12px] text-slate-700 leading-relaxed font-medium">{h.special_note}</p>
                                                            </div>
                                                        )}

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
                                                                placeholder={`${h.name}의 특이사항을 입력하세요... (${formatDisplayDate(date)} 날짜로 저장됩니다)`}
                                                                value={notesInput[h.name] || ''}
                                                                onChange={(e) => setNotesInput({ ...notesInput, [h.name]: e.target.value })}
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
                        {stats ? (
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
                        ) : (
                            <div className="px-4 py-10 text-center text-slate-400 text-xs">선택된 경주에 대한 분석 데이터가 없습니다.</div>
                        )}
                    </>
                )}
            </main>

            {/* 마이 베팅 슬립 (My Betting Slip) - app_bet_ui.jsx 스타일 반영 */}
            {viewMode === 'app' && (
                <div className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-[100] transition-transform duration-500 ease-in-out ${isBetPanelOpen ? 'translate-y-0' : 'translate-y-[calc(100%-60px)]'}`}>
                    <div className="bg-white rounded-t-[32px] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] overflow-hidden border-t border-slate-200 flex flex-col">
                        
                        {/* 🟢 상단 통합 헤더 */}
                        <div className="bg-slate-900 text-white px-3 py-3 flex items-center gap-2 shrink-0 shadow-lg z-20">
                            <div className="flex items-center gap-1 shrink-0 cursor-pointer hover:bg-slate-800 px-3 py-1.5 rounded-2xl transition-all group" onClick={() => setIsBetPanelOpen(!isBetPanelOpen)}>
                                <div className="bg-blue-600/20 p-1.5 rounded-lg shrink-0 group-hover:bg-blue-600/40">
                                    <Icon name="map-pin" size={16} className="text-blue-400" />
                                </div>
                                <span className="text-lg font-black tracking-tighter whitespace-nowrap">
                                    {currentLocData.location_name} <span className="text-blue-400">{race?.race_no}R</span>
                                </span>
                            </div>

                            <div className="flex-1 flex gap-1 items-center h-10 overflow-hidden">
                                {isLocked && null}
                                {[0, 1, 2].map(idx => (
                                    <TicketSlot
                                        key={idx}
                                        idx={idx}
                                        activeGameIdx={activeGameIdx}
                                        setActiveGameIdx={setActiveGameIdx}
                                        g={betGames[idx]}
                                        count={betCombinationCounts[idx] ?? 0}
                                        results={results}
                                        realtimeResults={realtimeResults}
                                        checkBetWin={checkBetWin}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* 메인 내용 영역 */}
                        <div className="bg-slate-50 max-h-[50vh] overflow-y-auto scrollbar-hide">
                            {(isLocked || (realtimeResults && realtimeResults.winners)) ? (
                                <div className="p-4 space-y-4 animate-fade-in">
                                    {/* 💰 상세 배당률 테이블 (Dividends Only) */}
                                    <div className="bg-slate-900 rounded-[24px] p-4 shadow-xl border border-slate-800">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                                            <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest italic">Live Dividends</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 gap-2">
                                            {realtimeResults?.dividends ? (
                                                (() => {
                                                    const dividendOrder = ['삼쌍승', '삼복승', '쌍승식', '복승식', '단승식', '연승식', '복연승'];
                                                    return Object.entries(realtimeResults.dividends)
                                                        .sort((a, b) => {
                                                            const idxA = dividendOrder.indexOf(a[0]);
                                                            const idxB = dividendOrder.indexOf(b[0]);
                                                            const sortA = idxA === -1 ? 999 : idxA;
                                                            const sortB = idxB === -1 ? 999 : idxB;
                                                            return sortA - sortB;
                                                        })
                                                        .map(([type, value]) => {
                                                            const winners = realtimeResults.winners || [];
                                                            let displayContent = null;

                                                            // 🥇 상세 연승/복연승 매핑 (P1/P2/P3 or QP-Pairs)
                                                            if ((type === '연승식' || type === '복연승') && Array.isArray(value) && winners.length >= 2) {
                                                                const isQP = type === '복연승';
                                                                displayContent = (
                                                                    <div className="flex flex-wrap gap-x-2.5 gap-y-1">
                                                                        {value.map((v, i) => {
                                                                            let comboTitle = "";
                                                                            if (isQP) {
                                                                                if (i === 0) comboTitle = `(${winners[0]},${winners[1]})`;
                                                                                else if (i === 1 && winners[2]) comboTitle = `(${winners[0]},${winners[2]})`;
                                                                                else if (i === 2 && winners[2]) comboTitle = `(${winners[1]},${winners[2]})`;
                                                                            } else {
                                                                                if (winners[i]) comboTitle = `(${winners[i]})`;
                                                                            }
                                                                            if (!comboTitle) return null;
                                                                            return (
                                                                                <React.Fragment key={i}>
                                                                                    {i > 0 && <span className="text-slate-600">/</span>}
                                                                                    <span className="text-white"><span className="text-indigo-400 opacity-70">{comboTitle}</span> {v}</span>
                                                                                </React.Fragment>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                );
                                                            } else {
                                                                let combo = "";
                                                                if (type === '단승식' && winners[0]) combo = `(${winners[0]})`;
                                                                else if (['복승식', '쌍승식'].includes(type) && winners[0] && winners[1]) {
                                                                    combo = `(${winners[0]}-${winners[1]})`;
                                                                } else if (['삼복승', '삼쌍승'].includes(type) && winners[0] && winners[1] && winners[2]) {
                                                                    combo = `(${winners[0]}-${winners[1]}-${winners[2]})`;
                                                                }
                                                                
                                                                displayContent = (
                                                                    <div className="flex items-center gap-2">
                                                                        {combo && <span className="text-indigo-400/60 font-black">{combo}</span>}
                                                                        <span className="text-white">{Array.isArray(value) ? value[0] : value}</span>
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <div key={type} className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-800/60 flex justify-between items-center shadow-sm hover:border-indigo-500/30 transition-all">
                                                                    <span className="text-[10px] font-black text-slate-400 shrink-0">{type}</span>
                                                                    <div className="text-[11px] font-black tabular-nums text-right flex-1 flex justify-end items-center">
                                                                        {displayContent}
                                                                        <span className="text-[9px] text-slate-600 font-medium ml-1.5 pt-0.5">배</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        });
                                                })()
                                            ) : (
                                                <div className="py-8 text-center text-[10px] text-slate-600 font-black border border-dashed border-slate-800 rounded-2xl uppercase tracking-widest bg-slate-900/40">
                                                    Waiting for Final Dividends...
                                                </div>
                                            )}
                                        </div>
                                    </div>



                                    {/* 💾 백업: 수동 결과 입력 (Admin 전용/사용자 백업) */}
                                    {isResultEntryPossible && user && (
                                        <div className="bg-white/50 p-3 rounded-xl border border-dashed border-slate-200 flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-slate-400">결과가 틀린 것 같나요?</span>
                                            <button 
                                                onClick={() => setIsResultEditMode(!isResultEditMode)} 
                                                className="text-[10px] font-black text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-all"
                                            >
                                                {isResultEditMode ? "입력 종료" : "수동 입력 (백업)"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {/* 승식 선택 그리드 */}
                                    <div className="bg-white p-3 border-b shadow-sm shrink-0 sticky top-0 z-10">
                                        <div className="grid grid-cols-7 gap-1">
                                            {['단승', '연승', '복승', '쌍승', '복연승', '삼복승', '삼쌍승'].map(type => (
                                                <button
                                                    key={type}
                                                    disabled={isLocked}
                                                    onClick={() => {
                                                        const next = [...betGames];
                                                        next[activeGameIdx] = { ...next[activeGameIdx], type };
                                                        setBetGames(next);
                                                        setModified();
                                                    }}
                                                    className={`py-1.5 rounded-lg border-2 text-[10px] font-black transition-all ${betGames[activeGameIdx].type === type
                                                            ? 'bg-slate-800 border-slate-800 text-white shadow-md z-10 scale-105'
                                                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                                        } ${isLocked ? 'opacity-50 cursor-not-allowed grayscale-[0.5]' : ''}`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-1.5 space-y-1.5">
                                        <div className="flex justify-between items-center mb-1 px-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
                                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Select Horses</span>
                                                <button
                                                    disabled={isLocked}
                                                    onClick={resetAllBets}
                                                    className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all active:scale-95 ${isLocked ? 'text-slate-200' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
                                                    title="전체 초기화"
                                                >
                                                    <Icon name="rotate-ccw" size={12} />
                                                    <span className="text-[10px] font-black">전체 초기화</span>
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-sm">
                                                <span className="text-[10px] font-black text-slate-400 uppercase leading-none">Live Combo</span>
                                                <span className="text-base font-black text-blue-600 tabular-nums leading-none">
                                                {(betCombinationCounts[activeGameIdx] ?? 0).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        {[1, 2, 3].map(r => {
                                            const g = betGames[activeGameIdx];
                                            const isNeeded = (r === 1) || (r === 2 && !['단승', '연승'].includes(g.type)) || (r === 3 && ['삼복승', '삼쌍승'].includes(g.type));
                                            if (!isNeeded) return null;

                                            const rowLabel = r === 1 ? (['단승', '연승'].includes(g.type) ? '마번 선택' : '1착/축') : (r === 2 ? '2착' : '3착');
                                            const activeHorseNos = race?.horses?.map(h => Number(h.horse_no)) || [];

                                            return (
                                                <div key={r} className="bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                                                    <div className="flex justify-between items-center px-1">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{rowLabel}</span>
                                                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{(g.ranks[r] || []).length}두</span>
                                                    </div>
                                                    <div className="grid grid-cols-8 gap-1.5">
                                                        {Array.from({ length: 16 }, (_, i) => i + 1).map(num => {
                                                            const isParticipating = activeHorseNos.includes(num);
                                                            const isSelected = g.ranks[r]?.includes(num);
                                                            const usedElsewhere = Object.entries(g.ranks).some(([rk, nums]) => Number(rk) !== r && nums.includes(num));
                                                            
                                                            return (
                                                                <button
                                                                    key={num}
                                                                    disabled={!isParticipating || isLocked}
                                                                    onClick={() => toggleHorseSelection(num, r)}
                                                                    className={`h-8 rounded-lg text-xs font-bold border-2 transition-all ${!isParticipating ? 'invisible' :
                                                                            isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-lg z-10 scale-105' :
                                                                                usedElsewhere ? 'bg-slate-50 border-slate-100 text-slate-200 cursor-not-allowed opacity-50' :
                                                                                    'bg-white border-slate-100 text-slate-700 hover:border-blue-200'
                                                                        } ${isLocked ? 'opacity-40 grayscale-[0.8] cursor-not-allowed' : ''}`}
                                                                >
                                                                    {num}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        <button
                                            onClick={savePicks}
                                            disabled={isLocked || totalBetCombinationCount === 0}
                                            className={`w-full py-3 rounded-2xl font-black text-base shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${isLocked
                                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                                    : totalBetCombinationCount > 0
                                                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
                                                        : 'bg-slate-100 text-slate-300 shadow-none'
                                                }`}
                                        >
                                            {isLocked ? (
                                                <>
                                                    <Icon name="lock" size={20} />
                                                    <div className="bg-red-500/20 px-3 py-1 rounded-xl text-xs font-black text-red-400">
                                                        LOCK
                                                    </div>
                                                </>
                                            ) : totalBetCombinationCount > 0 ? (
                                                <>
                                                    <Icon name="save" size={20} />
                                                    <div className="flex flex-col items-start leading-tight">
                                                        <div className="flex items-center gap-1.5">
                                                            <span>조합 클라우드 저장</span>
                                                            <div className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold">
                                                                {totalBetCombinationCount.toLocaleString()}조
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-80 scale-90 -ml-1">
                                                            {picksStatus === 'loading' && <div className="w-2 h-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                                            {picksStatus === 'synced' && <span className="text-[9px] font-black text-emerald-300 flex items-center gap-0.5"><Icon name="cloud-check" size={10} /> SYNCED</span>}
                                                            {picksStatus === 'local' && <span className="text-[9px] font-black text-amber-300 flex items-center gap-0.5"><Icon name="database" size={10} /> CACHED</span>}
                                                            {picksStatus === 'modified' && <span className="text-[9px] font-black text-blue-200 flex items-center gap-0.5"><Icon name="edit-3" size={10} /> EDITING</span>}
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                '마번을 선택해주세요'
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-up { animation: up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                .animate-fade-in { animation: fadeIn 0.4s ease-out; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .sticky-header-blur { backdrop-filter: blur(12px); background: rgba(255, 255, 255, 0.85); }
                .bar-fill { transition: width 1s cubic-bezier(0.16, 1, 0.3, 1); }
            `}</style>
        </div>
    );
}

export default App;

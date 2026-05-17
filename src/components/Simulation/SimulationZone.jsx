import React, { useState, useMemo, useEffect } from 'react';
import Icon from '../Icon.jsx';
import { AdvancedSimulationEngine } from '../../engines/AdvancedSimulationEngine.js';

const normalizeName = (name) => {
    if (!name) return "";
    return name.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
};

const PHYSICAL_DEFAULTS = { s1f: 14.2, g1f: 13.5 };

const getPhysicalProfile = (horse) => {
    // 순위(pos_s1f)가 아닌 실제 주파 시간(early_speed)만 참조
    let early = horse.early_speed || horse.meta?.early_speed || horse.avg_s1f_time || horse.meta?.avg_s1f_time;
    let g1f = horse.closing_speed || horse.meta?.closing_speed || horse.avg_g1f_time || horse.meta?.avg_g1f_time;

    if (!early || !g1f) {
        const hist = horse.recent_history || [];
        const validS1f = hist.filter(r => r.s1f && parseFloat(r.s1f) > 10.0);
        const validG1f = hist.filter(r => r.g1f && parseFloat(r.g1f) > 10.0);
        
        if (!early && validS1f.length > 0) early = validS1f.reduce((sum, r) => sum + parseFloat(r.s1f), 0) / validS1f.length;
        if (!g1f && validG1f.length > 0) g1f = validG1f.reduce((sum, r) => sum + parseFloat(r.g1f), 0) / validG1f.length;
    }

    return { 
        s1f: early ? Number(early) : PHYSICAL_DEFAULTS.s1f, 
        g1f: g1f ? Number(g1f) : PHYSICAL_DEFAULTS.g1f 
    };
};

// ==========================================
// 1. 마필 상세 분석 패널
// ==========================================
const HorseDetailPanel = ({ selectedHorse, onClose }) => {
    if (!selectedHorse) return null;

    const points = [
        { label: 'S1F', val: selectedHorse.meta?.pos_s1f },
        { label: 'C3', val: selectedHorse.meta?.pos_c3 },
        { label: 'C4', val: selectedHorse.meta?.pos_c4 },
        { label: 'G1F', val: selectedHorse.meta?.pos_g1f }
    ].filter(p => p.val !== undefined && p.val !== null);

    const warnings = selectedHorse.trace?.warnings || [];
    const simTrace = selectedHorse.sim_trace || {};
    const winProb = selectedHorse.win_prob !== undefined ? selectedHorse.win_prob * 100 : (selectedHorse.winProbability || 0);

    return (
        <div className="fixed right-0 top-0 h-full w-[75%] sm:w-[90%] max-w-[400px] bg-slate-900/95 backdrop-blur-xl border-l border-slate-700 p-4 md:p-6 shadow-2xl z-50 overflow-y-auto" style={{ animation: 'slideInRight 0.3s ease-out forwards' }}>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-black text-indigo-300 bg-indigo-900/50 px-2 py-0.5 rounded border border-indigo-500/30">{selectedHorse.horse_no}번 마필</span>
                        <span className="text-[10px] font-black text-rose-300 bg-rose-900/50 px-2 py-0.5 rounded border border-rose-500/30">{selectedHorse.style || '알수없음'}</span>
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight">{selectedHorse.name}</h2>
                    <p className="text-slate-400 text-xs font-bold mt-1">{selectedHorse.jockey} 기수 | 부중 {selectedHorse.targetWeight || selectedHorse.burden_weight}kg</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors shrink-0">
                    <Icon name="chevron-right" size={24} />
                </button>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                        { label: '우승 확률', val: winProb.toFixed(1), color: 'text-indigo-400' },
                        { label: '복병 지수', val: (selectedHorse.underdog_index || 0), color: 'text-rose-400' },
                        { label: '선행 확률', val: (selectedHorse.sim_stats?.leads || 0).toFixed(1), color: 'text-orange-400' },
                        { label: '입상 확률', val: (selectedHorse.sim_stats?.top3 || 0).toFixed(1), color: 'text-emerald-400' }
                    ].map((item, i) => (
                        <div key={i} className="bg-slate-800/80 border border-slate-700/50 p-3 rounded-xl text-center shadow-inner">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{item.label}</p>
                            <p className={`text-lg font-black ${item.color}`}>{item.val}<span className="text-[10px] ml-0.5 opacity-60">%</span></p>
                        </div>
                    ))}
                </div>

                {/* [NEW] 전개 시나리오별 조건부 우승 확률 */}
                {selectedHorse.sim_stats && selectedHorse.sim_stats.high_pace_win !== undefined && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 mt-2">
                        <div className="flex items-center gap-2 mb-3">
                            <Icon name="bar-chart-2" size={14} className="text-purple-400" />
                            <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-wide">전개 시나리오별 우승 확률 (조건부)</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="p-2 bg-slate-900 rounded-lg border border-slate-700 text-center relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-0.5 bg-rose-500/50"></div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">하이페이스</p>
                                <span className="text-sm font-black text-rose-400">{selectedHorse.sim_stats.high_pace_win}<span className="text-[9px]">%</span></span>
                            </div>
                            <div className="p-2 bg-slate-900 rounded-lg border border-slate-700 text-center relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-500/50"></div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">평범페이스</p>
                                <span className="text-sm font-black text-indigo-400">{selectedHorse.sim_stats.normal_pace_win}<span className="text-[9px]">%</span></span>
                            </div>
                            <div className="p-2 bg-slate-900 rounded-lg border border-slate-700 text-center relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-500/50"></div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">슬로우페이스</p>
                                <span className="text-sm font-black text-emerald-400">{selectedHorse.sim_stats.slow_pace_win}<span className="text-[9px]">%</span></span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Icon name="zap" size={14} className="text-indigo-400" />
                        <h3 className="text-[11px] font-black text-indigo-400 uppercase tracking-wide">AI 시뮬레이션 총평</h3>
                    </div>
                    <p className="text-slate-200 text-sm font-medium leading-relaxed italic">"{selectedHorse.ai_verdict || "안정적인 전력이 예상됩니다."}"</p>
                </div>

                {((selectedHorse.underdog_index || 0) >= 50 || (selectedHorse.underdog_reasons?.length > 0)) && (
                    <div className="bg-rose-900/20 border border-rose-500/30 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                 <Icon name="flame" size={14} className="text-rose-400" />
                                 <h3 className="text-[11px] font-black text-rose-400 uppercase tracking-wide">복병 분석 (UD Index)</h3>
                            </div>
                            <span className="text-xl font-black text-rose-400">{selectedHorse.underdog_index || 0}<span className="text-[10px] ml-0.5 opacity-60">%</span></span>
                        </div>
                        {selectedHorse.underdog_reasons?.length > 0 ? (
                            <div className="space-y-2 mt-2 border-t border-rose-500/20 pt-3">
                                <div className="text-[10px] font-bold text-slate-400 uppercase">추천 근거:</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedHorse.underdog_reasons.map((reason, idx) => (
                                        <span key={idx} className="text-[10px] font-bold py-1 px-2 bg-rose-500/20 text-rose-300 rounded border border-rose-500/30">
                                            {reason}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 font-medium italic">특이 복병 징후 없음</p>
                        )}
                    </div>
                )}

                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Icon name="activity" size={14} className="text-blue-400" />
                        <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-wide">Physical Profile</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {Object.entries(getPhysicalProfile(selectedHorse)).map(([key, val], i) => (
                            <div key={i} className="p-3 bg-slate-900 rounded-xl border border-slate-700 text-center">
                                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">
                                    {key === 's1f' ? '초반 순발 (S1F)' : '최종 스퍼트 (G1F)'}
                                </p>
                                <span className="text-lg font-black text-white">{Number(val).toFixed(2)}s</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <h3 className="text-[11px] font-black text-slate-300 uppercase flex items-center gap-2"><Icon name="cpu" size={14} className="text-slate-400" /> 상세 트레이스</h3>
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 font-mono text-xs space-y-2 max-h-[250px] overflow-y-auto">
                        {typeof selectedHorse.trace === 'object' && selectedHorse.trace !== null && !Array.isArray(selectedHorse.trace) ? (
                            Object.entries(selectedHorse.trace)
                                .filter(([k]) => k !== 'warnings')
                                .map(([k, v], idx) => (
                                    <div key={`trace-${idx}`} className="flex justify-between items-center text-slate-300 py-1 border-b border-slate-800 last:border-0">
                                        <span className="text-[10px] text-slate-400 capitalize">{k.replace(/_/g, ' ')}</span>
                                        <span className={typeof v === 'number' && v < 0 ? 'text-emerald-400' : 'text-slate-200'}>
                                            {typeof v === 'number' ? (v > 0 ? `+${v.toFixed(3)}` : v.toFixed(3)) : String(v)}
                                        </span>
                                    </div>
                                ))
                        ) : Array.isArray(selectedHorse.trace) && selectedHorse.trace.length > 0 ? (
                            selectedHorse.trace.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-slate-300 py-1 border-b border-slate-800 last:border-0">
                                    <span className="text-[10px] text-slate-400">{item.factor || item.name}</span>
                                    <span className={String(item.impact || item.value).includes('-') ? 'text-emerald-400' : 'text-rose-400'}>
                                        {item.impact || (item.value > 0 ? '+' : '') + item.value.toFixed(2) + 's'}
                                    </span>
                                </div>
                            ))
                        ) : null}

                        {typeof selectedHorse.sim_trace === 'object' && selectedHorse.sim_trace !== null && (
                            Object.entries(selectedHorse.sim_trace).map(([k, v], idx) => (
                                <div key={`sim-${idx}`} className="flex justify-between items-center text-slate-300 py-1 border-b border-slate-800 last:border-0">
                                    <span className="text-[10px] text-indigo-400 font-bold capitalize">{k.replace(/_/g, ' ')}</span>
                                    <span className={typeof v === 'number' && v < 0 ? 'text-emerald-400' : 'text-slate-200 font-bold'}>
                                        {typeof v === 'number' ? (v > 0 ? `+${v.toFixed(3)}` : v.toFixed(3)) : String(v)}
                                    </span>
                                </div>
                            ))
                        )}

                        {!(selectedHorse.trace || selectedHorse.sim_trace) && (
                            <div className="text-slate-500 italic text-center py-2">보정 내역 없음</div>
                        )}

                        <div className="pt-2 mt-2 border-t border-slate-700 flex justify-between font-black text-sm text-white">
                            <span className="font-sans text-[10px] text-slate-400 uppercase tracking-wide">최종 예측 타임 (μ)</span>
                            <span className="text-indigo-300">{(selectedHorse.mu || selectedHorse.expect_time || 0).toFixed(2)}s</span>
                        </div>
                    </div>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}} />
        </div>
    );
};

// ==========================================
// 2. 메인 대시보드
// ==========================================
const SimulationZone = ({ race, loc, info, trackInfo, statsAnalysis, sireInfo, jockeyStats, trainerStats, realtimeMoisture, user }) => {
    const [selectedHorse, setSelectedHorse] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'win_prob', direction: 'desc' });
    const [localSimResults, setLocalSimResults] = useState([]);
    const [serverSimResults, setServerSimResults] = useState(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [isLoadingServerData, setIsLoadingServerData] = useState(false);
    const [firestoreSimResults, setFirestoreSimResults] = useState(null);
    const [paceTally, setPaceTally] = useState(null);
    const [selectedPace, setSelectedPace] = useState('auto');

    
    // 실시간 데이터 우선, 없으면 트랙 기본 정보, 둘 다 없으면 10%
    const defaultMoisture = realtimeMoisture !== undefined && realtimeMoisture !== null 
        ? realtimeMoisture 
        : (info?.moisture ? String(info.moisture).replace('%', '') : 10);
        
    const [moisture, setMoisture] = useState(
        (realtimeMoisture !== undefined && realtimeMoisture !== null) 
            ? Number(realtimeMoisture) 
            : (info?.moisture ? Number(String(info.moisture).replace('%', '')) : 10)
    );
    
    useEffect(() => {
        if (realtimeMoisture !== undefined && realtimeMoisture !== null) {
            setMoisture(Number(realtimeMoisture));
        } else if (info?.moisture) {
            setMoisture(Number(String(info.moisture).replace('%', '')));
        }
    }, [realtimeMoisture, info?.moisture]);

    // 0. 최상위 race_simulations 컬렉션에서 실시간 동기화
    useEffect(() => {
        if (!race || !race.race_no || !window.fb?.isReady) return;
        const { db, doc, onSnapshot } = window.fb;
        const dateStr = race.race_id?.split('_')[0] || race.date?.replace(/-/g, '') || "";
        const locUpper = (loc || 'seoul').toUpperCase();
        const docId = `${dateStr}_${locUpper}_${race.race_no}`;

        const docRef = doc(db, 'race_simulations', docId);
        const unsub = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                console.log(`📡 [SimulationZone] loaded from race_simulations/${docId}`);
                setFirestoreSimResults(data.horses || []);
                if (data.pace_tally) setPaceTally(data.pace_tally);
            } else {
                setFirestoreSimResults(null);
                setPaceTally(null);
            }
        }, (err) => {
            console.error(`Error loading from race_simulations/${docId}:`, err);
        });

        return () => unsub();
    }, [race?.race_id, race?.race_no, loc]);

    // 1. 서버 시뮬레이션 결과 파일 로드 (yyyymmdd_LOC_sim_results.json)
    useEffect(() => {
        if (!race || !race.race_info) return;
        
        const dateStr = race.race_id?.split('_')[0] || race.date?.replace(/-/g, '') || "";
        if (!dateStr) return;

        const locUpper = (loc || 'seoul').toUpperCase();
        const fileName = `${dateStr}_${locUpper}_sim_results.json`;
        
        setIsLoadingServerData(true);
        const baseUrl = import.meta.env.BASE_URL || '/';
        const url = `${baseUrl}/${fileName}`.replace(/\/+/g, '/');
        
        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error("Server data not found");
                return res.json();
            })
            .then(data => {
                const raceKey = `${dateStr}_${race.race_no}`;
                if (data.races && data.races[raceKey]) {
                    console.log(`[SimulationZone] Server data loaded for race ${raceKey}`);
                    setServerSimResults(data.races[raceKey].horses || []);
                    if (data.races[raceKey].pace_tally) setPaceTally(data.races[raceKey].pace_tally);
                } else {
                    setServerSimResults(null);
                    setPaceTally(null);
                }
            })
            .catch(err => {
                console.log(`[SimulationZone] No server sim file found (${fileName}).`);
                setServerSimResults(null);
            })
            .finally(() => setIsLoadingServerData(false));
    }, [race?.race_id, race?.race_no, loc]);

    const handleSort = (key) => {
        setSortConfig(prev => {
            const isAscDefault = key === 'base_mu' || key === 'smoothed_mu' || key === 'horse_no';
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: isAscDefault ? 'asc' : 'desc' };
        });
    };

    const runLocalSimulation = () => {
        if (!race || !race.horses) return;
        setIsSimulating(true);
        setTimeout(() => {
            try {
                const engine = new AdvancedSimulationEngine(
                    race, loc || 'seoul', trackInfo, statsAnalysis, sireInfo, jockeyStats, trainerStats, moisture
                );
                const results = engine.runSimulation();
                setLocalSimResults(results);
            } catch (err) {
                console.error("Simulation Engine Error:", err);
            } finally {
                setIsSimulating(false);
            }
        }, 300);
    };

    useEffect(() => {
        if (race && race.horses && localSimResults.length === 0 && !isSimulating) {
            runLocalSimulation();
        }
    }, [race?.race_id, localSimResults.length]);

    const dominantPace = useMemo(() => {
        const tally = paceTally || race.server_sim?.pace_tally;
        if (!tally) return null;
        let maxPace = null;
        let maxVal = -1;
        for (const [k, v] of Object.entries(tally)) {
            if (v > maxVal) { maxVal = v; maxPace = k; }
        }
        return maxPace;
    }, [paceTally, race.server_sim?.pace_tally]);

    const enhancedHorses = useMemo(() => {
        const horses = race?.horses || [];
        let merged = horses.map(h => {
            const horseNo = h.horse_no || h.no;
            
            const localData = localSimResults.find(r => String(r.horse_no) === String(horseNo)) || null;
            const topLevelData = firestoreSimResults?.find(r => String(r.horse_no || r.no) === String(horseNo)) || null;
            const firestoreData = (race.server_sim?.horses || [])?.find(r => String(r.horse_no || r.no) === String(horseNo)) || null;
            const serverFileData = serverSimResults?.find(r => String(r.horse_no || r.no) === String(horseNo)) || null;
            
            const combinedData = topLevelData || firestoreData || serverFileData || localData || {};

            let rawWinProb = combinedData.win_prob !== undefined ? combinedData.win_prob : (h.win_prob !== undefined ? h.win_prob : 0);
            
            const targetPace = selectedPace === 'auto' ? dominantPace : selectedPace;

            if (targetPace && targetPace !== '전체' && combinedData.sim_stats) {
                if (targetPace === '하이페이스' && combinedData.sim_stats.high_pace_win !== undefined) {
                    rawWinProb = combinedData.sim_stats.high_pace_win;
                } else if (targetPace === '평범페이스' && combinedData.sim_stats.normal_pace_win !== undefined) {
                    rawWinProb = combinedData.sim_stats.normal_pace_win;
                } else if (targetPace === '슬로우페이스' && combinedData.sim_stats.slow_pace_win !== undefined) {
                    rawWinProb = combinedData.sim_stats.slow_pace_win;
                }
            }

            let mu = combinedData.mu || h.mu || combinedData.expectedTime || 0;
            let sigma = combinedData.sigma || h.sigma || combinedData.stdDev || 0;
            let smoothed_mu = combinedData.trace?.smoothed_mu || h.trace?.smoothed_mu || combinedData.smoothed_mu || h.smoothed_mu || mu;

            let moistureAdj = 0;
            let weightAdj = 0;

            const getTrackSpeedBonus = (m, locName) => {
                const locUpper = String(locName || 'SEOUL').toUpperCase();
                if (locUpper === 'SEOUL') {
                    if (m <= 2.0) return -0.40;
                    if (m < 10.0) return 0.0;
                    if (m < 15.0) return (m - 10.0) * 0.06;
                    return 0.3 + Math.min(m - 15.0, 5.0) * 0.08;
                } else { // BUSAN
                    if (m < 5.0) return 0.50;
                    if (m < 10.0) return 0.0;
                    if (m < 15.0) return (m - 10.0) * 0.08;
                    return 0.4 + Math.min(m - 15.0, 5.0) * 0.10;
                }
            };

            if (mu > 0 && moisture !== undefined) {
                const baseBonus = getTrackSpeedBonus(8.0, loc); 
                const currentBonus = getTrackSpeedBonus(Number(moisture), loc);
                moistureAdj = (baseBonus - currentBonus) * ((race.race_info?.distance || 1200.0) / 1200.0);
                mu += moistureAdj;
            }

            if (mu > 0 && h.horse_weight && h.prev_weight) {
                const weightDiff = Number(h.horse_weight) - Number(h.prev_weight);
                weightAdj = weightDiff * 0.15;
                mu += weightAdj;
            }

            const adjustedSimTrace = {
                ...combinedData.sim_trace,
                "moisture_adj": moistureAdj,
                "weight_adj": weightAdj,
                "adjusted_mu": mu
            };

            let normalizedWinProb = rawWinProb;
            if (rawWinProb > 0.01 && !String(rawWinProb).startsWith("0.00")) {
                normalizedWinProb = rawWinProb / 100;
            } else if (rawWinProb <= 0.01) {
                normalizedWinProb = rawWinProb / 100;
            }
            if (mu > 0 && (combinedData.mu || h.mu) > 0) {
                const baseMu = combinedData.mu || h.mu || 0;
                const muDiff = baseMu - mu;
                normalizedWinProb += muDiff * 0.06;
                normalizedWinProb = Math.max(0.01, Math.min(0.99, normalizedWinProb));
            }

            return {
                ...h,
                ...combinedData,
                name: normalizeName(h.name),
                win_prob: normalizedWinProb,
                mu: mu,
                sigma: sigma,
                smoothed_mu: smoothed_mu,
                sim_trace: adjustedSimTrace,
                underdog_index: combinedData.underdog_index !== undefined ? combinedData.underdog_index : (h.underdog_index || 0),
                sim_stats: {
                    ...(combinedData.sim_stats || {}),
                    top3: Math.max(normalizedWinProb * 100, (combinedData.sim_stats?.top3 || h.sim_stats?.top3 || (normalizedWinProb * 100 * 2.2))),
                    leads: combinedData.sim_stats?.leads || h.sim_stats?.leads || (combinedData.style === '선행' ? 80 : (combinedData.style === '선입' ? 40 : 10))
                },
                horse_no: horseNo || '-',
                style: combinedData.style || h.style || '알수없음',
                meta: { ...h.meta, ...combinedData.meta }
            };
        });

        const totalRawWinProb = merged.reduce((sum, h) => sum + (h.win_prob || 0), 0);
        const normalized = totalRawWinProb > 0
            ? merged.map(h => ({ ...h, win_prob: (h.win_prob || 0) / totalRawWinProb }))
            : merged;

        return [...normalized].sort((a, b) => {
            let aVal, bVal;
            const key = sortConfig.key;
            if (key === 'top3') { aVal = a.sim_stats?.top3 || 0; bVal = b.sim_stats?.top3 || 0; }
            else if (key === 'leads') { aVal = a.sim_stats?.leads || 0; bVal = b.sim_stats?.leads || 0; }
            else if (key === 'base_mu') { aVal = a.mu || 999; bVal = b.mu || 999; }
            else if (key === 'smoothed_mu') { aVal = a.smoothed_mu || a.mu || 999; bVal = b.smoothed_mu || b.mu || 999; }
            else if (key === 'horse_no') { aVal = Number(a.horse_no) || 99; bVal = Number(b.horse_no) || 99; }
            else { aVal = a[key] || 0; bVal = b[key] || 0; }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [race, serverSimResults, firestoreSimResults, localSimResults, sortConfig, moisture, paceTally, selectedPace]);


    const raceStats = useMemo(() => {
        const validMus = enhancedHorses.map(h => h.mu).filter(m => m > 10);
        const avg = validMus.length > 0 ? validMus.reduce((a, b) => a + b, 0) / validMus.length : 0;
        const s1fTimes = enhancedHorses.map(h => getPhysicalProfile(h).s1f);
        const g1fTimes = enhancedHorses.map(h => getPhysicalProfile(h).g1f);

        return {
            avg,
            s1fAvg: s1fTimes.length > 0 ? s1fTimes.reduce((a, b) => a + b, 0) / s1fTimes.length : PHYSICAL_DEFAULTS.s1f,
            g1fAvg: g1fTimes.length > 0 ? g1fTimes.reduce((a, b) => a + b, 0) / g1fTimes.length : PHYSICAL_DEFAULTS.g1f
        };
    }, [enhancedHorses]);


    if (!race || !race.horses) {
        return (
            <div className="bg-slate-900 border border-slate-700 rounded-3xl h-40 flex items-center justify-center shadow-lg">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">시뮬레이션 데이터를 불러오는 중...</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-xl md:rounded-3xl overflow-hidden shadow-2xl flex flex-col font-sans w-full text-slate-100 p-2 md:p-8 animate-in fade-in duration-300">
            
            <header className="mb-6 flex flex-col md:flex-row gap-4 md:justify-between md:items-end pb-5 border-b border-slate-800">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <Icon name="flame" size={16} className="text-orange-500 fill-orange-500" />
                        <span className="text-[11px] font-black text-orange-500 uppercase tracking-widest">Next Gen Analysis</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase">Race AI Analytics</h2>
                        <div className="flex items-center gap-2">
                            {race.server_sim ? (
                                <span className="bg-blue-500/20 text-blue-400 text-[10px] font-black px-2 py-1 rounded border border-blue-500/30 flex items-center gap-1">
                                    <Icon name="cloud" size={12} /> FIRESTORE SYNCED
                                </span>
                            ) : serverSimResults ? (
                                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-1 rounded border border-emerald-500/30 flex items-center gap-1">
                                    <Icon name="check-circle" size={12} /> SERVER FILE READY
                                </span>
                            ) : null}

                            <button 
                                onClick={runLocalSimulation}
                                disabled={isSimulating}
                                className={`text-[11px] font-black px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 shadow-lg active:scale-95 ${
                                    isSimulating 
                                    ? "bg-slate-700 text-slate-400 cursor-not-allowed" 
                                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
                                }`}
                            >
                                <Icon name="refresh-cw" size={12} className={isSimulating ? "animate-spin" : ""} />
                                {isSimulating ? "AI 연산중..." : "AI 시뮬레이션"}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-start md:items-end shrink-0">
                    <div className="text-[11px] text-indigo-300 font-black italic mb-1 uppercase tracking-wide">Pro Prediction V3.5</div>
                    <div className="text-[11px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5 whitespace-nowrap bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                        <Icon name="calendar" size={12} /> {(race.race_info?.distance) ? `${race.race_info.distance}m` : '알수없음'} | {loc === 'seoul' ? 'SEOUL' : 'BUSAN'}
                    </div>
                </div>
            </header>

            <main className="flex flex-col xl:flex-row gap-2 md:gap-6">
                <div className="flex-1 min-w-0 space-y-2 md:space-y-4">
                    <div className="bg-slate-800/60 p-2 md:p-4 flex flex-wrap items-center gap-2 md:gap-6 border border-slate-700/50 rounded-xl md:rounded-2xl">
                        <div className="flex items-center gap-2 border-r border-slate-700 pr-4 shrink-0">
                            <Icon name="activity" size={16} className="text-indigo-400" />
                            <p className="text-sm font-bold text-slate-200">{loc === 'seoul' ? '서울' : '부산'} | {race.race_info?.distance}m</p>
                        </div>
                        <div className="flex-1 flex flex-col justify-center gap-1 min-w-[200px]">
                            <div className="flex items-center justify-between">
                                <p className="text-[11px] text-slate-400 uppercase font-black flex items-center gap-1.5">
                                    <Icon name="droplet" size={12} className="text-blue-400" /> 함수율 설정
                                </p>
                                <span className="text-sm font-black text-blue-400">{moisture}%</span>
                            </div>
                            <input
                                type="range" min="1" max="25" value={moisture}
                                onChange={(e) => setMoisture(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="bg-slate-800/40 rounded-xl md:rounded-2xl overflow-hidden border border-slate-700/50 shadow-xl">
                        <div className="px-2 md:px-5 py-2 md:py-3 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/80">
                            <div className="flex items-center gap-2">
                                <Icon name="trophy" size={14} className="text-orange-400" />
                                <h3 className="font-black text-[10px] md:text-xs tracking-widest text-slate-200 uppercase">분석 리더보드</h3>
                                {dominantPace && (
                                    <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                        페이스: {dominantPace}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="overflow-x-auto w-full scrollbar-hide">
                            <table className="w-full text-left border-collapse text-[10px] md:text-sm">
                                <thead>
                                    <tr className="text-[9px] md:text-[10px] text-slate-400 uppercase font-bold border-b border-slate-700 bg-slate-900/50">
                                        <th onClick={() => handleSort('horse_no')} className="px-1 py-2 md:py-3 text-center w-8 md:w-12 cursor-pointer hover:text-white">#</th>
                                        <th className="px-1 py-2 md:py-3 text-left w-28 md:w-auto">마필/기수</th>
                                        <th className="px-1 py-2 md:py-3 text-center w-24 md:w-32">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="cursor-pointer hover:text-white" onClick={() => handleSort('win_prob')}>우승%</span>
                                                <select
                                                    value={selectedPace}
                                                    onChange={(e) => setSelectedPace(e.target.value)}
                                                    className="bg-slate-800 text-indigo-300 border border-slate-600 rounded px-1 py-0.5 text-[8px] md:text-[9px] font-black focus:outline-none"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <option value="auto">AI추천{dominantPace ? `(${dominantPace.replace('페이스','')})` : ''}</option>
                                                    <option value="전체">전체평균</option>
                                                    <option value="하이페이스">하이페이스</option>
                                                    <option value="평범페이스">평범페이스</option>
                                                    <option value="슬로우페이스">슬로우페이스</option>
                                                </select>
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('top3')} className="px-1 py-2 md:py-3 text-center cursor-pointer hover:text-white">입상%</th>
                                        <th onClick={() => handleSort('leads')} className="px-1 py-2 md:py-3 text-center cursor-pointer hover:text-white">선행%</th>
                                        <th onClick={() => handleSort('base_mu')} className="px-1 py-2 md:py-3 text-center cursor-pointer hover:text-white hidden sm:table-cell">기준값</th>
                                        <th onClick={() => handleSort('smoothed_mu')} className="px-1 py-2 md:py-3 text-center text-amber-500/80 cursor-pointer hover:text-white">보정 평균</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {enhancedHorses.map((h, idx) => {
                                        const isFavorite = idx === 0;
                                        const profile = getPhysicalProfile(h);
                                        return (
                                            <tr key={h.name}
                                                onClick={() => setSelectedHorse(prev => prev?.name === h.name ? null : h)}
                                                className={`group cursor-pointer transition-colors hover:bg-slate-700/30 ${isFavorite ? 'bg-indigo-900/10' : ''}`}
                                            >
                                                <td className="px-1 py-2 md:py-3 text-center">
                                                    <span className="inline-block bg-slate-800 text-slate-300 font-mono font-black text-[10px] md:text-sm px-1 md:px-2 py-0.5 rounded border border-slate-700">
                                                        {h.horse_no}
                                                    </span>
                                                </td>
                                                <td className="px-1 py-2 md:py-3">
                                                    <div className="flex flex-col gap-0 max-w-[100px] md:max-w-none">
                                                        <span className={`font-black text-[11px] md:text-sm truncate ${isFavorite ? 'text-white' : 'text-slate-200'}`}>{h.name}</span>
                                                        <div className="flex items-center gap-1 flex-wrap opacity-70">
                                                            <span className="text-[8px] px-1 bg-slate-800 rounded text-slate-400">{profile.s1f.toFixed(1)}/{profile.g1f.toFixed(1)}</span>
                                                            <span className="text-[8px] font-bold text-slate-500">{h.style.replace('형','')}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-1 py-2 md:py-3 text-center text-indigo-400 font-black text-[11px] md:text-sm">{(h.win_prob * 100).toFixed(0)}%</td>
                                                <td className="px-1 py-2 md:py-3 text-center text-slate-300 font-bold text-[10px] md:text-xs">{(h.sim_stats?.top3 || 0).toFixed(0)}%</td>
                                                <td className="px-1 py-2 md:py-3 text-center text-rose-400 font-bold text-[10px] md:text-xs">{(h.sim_stats?.leads || 0).toFixed(0)}%</td>
                                                <td className="px-1 py-2 md:py-3 text-center text-slate-400 font-mono text-[10px] md:text-xs hidden sm:table-cell">{(h.mu || 0).toFixed(1)}</td>
                                                <td className="px-1 py-2 md:py-3 text-center text-amber-500 font-mono text-[10px] md:text-xs font-bold">{(h.smoothed_mu || h.mu || 0).toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="w-full xl:w-60 space-y-4 shrink-0">
                    <div className="bg-slate-800/60 p-4 border border-slate-700/50 rounded-2xl shadow-xl">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Icon name="activity" size={14} className="text-orange-400" /> ENGINE ANALYTICS
                        </h3>
                        <div className="flex flex-col">
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">경주 평균 Mu</p>
                            <p className="text-2xl font-black text-white leading-none tracking-tight">{raceStats.avg.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </main>

            {selectedHorse && <HorseDetailPanel selectedHorse={selectedHorse} onClose={() => setSelectedHorse(null)} />}
            
            <style dangerouslySetInnerHTML={{__html: `
                input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 14px; width: 14px; border-radius: 50%; background: #6366f1; border: 2px solid #fff; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        </div>
    );
};

export default SimulationZone;

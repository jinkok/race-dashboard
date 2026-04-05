import React, { useState, useMemo, useEffect, useRef } from 'react';
import Icon from '../Icon.jsx';
import { AdvancedSimulationEngine } from '../../engines/AdvancedSimulationEngine.js';

const SimulationZone = ({ race, loc, trackInfo, statsAnalysis, sireInfo, jockeyStats, trainerStats, realtimeMoisture, user }) => {
    const [isSimulating, setIsSimulating] = useState(false);
    const [simResults, setSimResults] = useState([]);
    const [horsePositions, setHorsePositions] = useState({});
    const [isRunning, setIsRunning] = useState(false);
    const [simPhase, setSimPhase] = useState(0); 
    const [displayMode, setDisplayMode] = useState('track'); 
    const [moisture, setMoisture] = useState(realtimeMoisture || 10);
    const [expandedTraces, setExpandedTraces] = useState({});

    // [REAL-TIME SYNC] Update local moisture state when prop changes (from Firestore/Parent)
    useEffect(() => {
        if (realtimeMoisture !== undefined && realtimeMoisture !== null) {
            setMoisture(Number(realtimeMoisture));
        }
    }, [realtimeMoisture]);
    
    // Animation frame reference
    const requestRef = useRef();

    const toggleTrace = (horseNo) => {
        const id = String(horseNo);
        setExpandedTraces(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const runSimulation = () => {
        if (!race || !race.horses) return;
        setIsSimulating(true);
        setIsRunning(false);
        setSimResults([]);
        setExpandedTraces({}); // Reset expanded states
        
        if (requestRef.current) cancelAnimationFrame(requestRef.current);

        setTimeout(() => {
            try {
                // Using the LATEST high-precision engine logic
                const engine = new AdvancedSimulationEngine(
                    race, 
                    loc || 'seoul', 
                    trackInfo, 
                    statsAnalysis, 
                    sireInfo, 
                    jockeyStats, 
                    trainerStats,
                    moisture
                );
                const results = engine.runSimulation();
                
                if (results && results.length > 0) {
                    setSimResults(results);
                    // Auto-expand the winner's trace for immediate feedback
                    setExpandedTraces({ [String(results[0].horse_no)]: true });
                    // Start track animation with the stable server-style logic
                    setTimeout(() => startTrackAnimation(results), 50);
                }
            } catch (err) {
                console.error("Simulation Engine Error:", err);
            } finally {
                setIsSimulating(false);
            }
        }, 800);
    };

    // [STABLE SERVER LOGIC] - Reverting track movement logic to the proven server version
    const startTrackAnimation = (results) => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        
        setIsRunning(true);
        setSimPhase(0);
        const duration = 4000;
        const startTime = performance.now();
        
        const horseStats = race.horses.map(h => {
            const res = results.find(r => r.horse_no === h.horse_no);
            const winProb = res ? res.winProbability : 10;
            const rank = results.findIndex(r => r.horse_no === h.horse_no);
            // Stable 90% finish boundary
            const finalPos = 90 - (rank * (12 / Math.max(results.length - 1, 1))); 
            
            // Jittered speed components for realism
            const jitter = 0.8 + (Math.random() * 0.4);
            const speedCurve = winProb > 20 ? 1.1 * jitter : winProb > 10 ? 1.3 * jitter : 1.5 * jitter;
            return { horse_no: h.horse_no, finalPos, speedCurve };
        });

        const animate = (time) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Stable 3-phase progression
            if (progress < 0.3) setSimPhase(0);
            else if (progress < 0.7) setSimPhase(1);
            else setSimPhase(2);

            const newPositions = {};
            horseStats.forEach(stat => {
                // Single smooth curve power function per horse
                const p = Math.pow(progress, stat.speedCurve);
                const currentPos = 5 + (p * (stat.finalPos - 5));
                newPositions[stat.horse_no] = currentPos;
            });
            
            setHorsePositions(newPositions);
            
            if (progress < 1) {
                requestRef.current = requestAnimationFrame(animate);
            } else {
                setIsRunning(false);
            }
        };
        
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    // [PIXEL-PERFECT UI] Matching the latest screenshot design exactly
    const HorseAnalysisCard = ({ r, index, isRanked = false }) => {
        const horseData = race?.horses?.find(h => h.horse_no === r.horse_no);
        const isWinner = index === 0;
        const isExpanded = expandedTraces[String(r.horse_no)];
        
        return (
            <div className={`bg-[#0f172a] border transition-all duration-500 overflow-hidden rounded-[32px] hover:bg-[#1e293b]/80 group ${isWinner ? 'border-yellow-500/50 shadow-[0_0_25px_rgba(234,179,8,0.15)] ring-1 ring-yellow-500/10' : 'border-slate-800/60 shadow-xl'}`}>
                <div className="p-6">
                    <div className="flex items-center gap-5 mb-8">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-xl shadow-lg transform transition-transform group-hover:scale-110 ${isWinner ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-[#0f172a]' : 'bg-[#1e293b] text-white border border-slate-700'}`}>
                            {r.horse_no}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md tracking-widest ${r.style === '선행' ? 'bg-rose-500/20 text-rose-400' : r.style === '선입' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                    {r.style}
                                </span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{index + 1}위 예상</span>
                            </div>
                            <div className="text-lg font-black text-white truncate tracking-tight">
                                {horseData?.name || '알 수 없음'}
                            </div>
                        </div>
                        <button 
                            onClick={() => toggleTrace(r.horse_no)}
                            className={`p-2 rounded-xl transition-all ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500 hover:text-white hover:bg-slate-700'}`}
                        >
                            <Icon name={isExpanded ? "chevron-up" : "activity"} size={16} />
                        </button>
                    </div>
                    
                    <div className="space-y-8">
                        <div>
                            <div className="flex justify-between items-end mb-3 px-1">
                                <span className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em]">우석 확률</span>
                                <span className={`text-2xl font-black leading-none italic ${isWinner ? 'text-amber-400' : 'text-slate-200'}`}>{r.winProbability.toFixed(1)}%</span>
                            </div>
                            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80 p-0.5 shadow-inner">
                                <div className={`h-full transition-all duration-1000 ease-out rounded-full ${isWinner ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-indigo-600 to-indigo-400 font-bold'}`} style={{ width: `${r.winProbability}%` }} />
                            </div>
                        </div>

                        <div className="flex justify-between items-center text-[12px] font-bold py-4 px-5 bg-black/40 rounded-2xl border border-white/5 group-hover:border-white/10 transition-colors">
                            <span className="text-slate-500 uppercase tracking-widest text-[9px]">기록 변동성 (StdDev)</span>
                            <span className={`${isWinner ? 'text-amber-400' : 'text-indigo-400'} font-black text-base tabular-nums`}>{r.stdDev.toFixed(2)}초</span>
                        </div>
                    </div>
                </div>

                {/* [NEW] Logic Trace Panel - Visualization of current adjustment factors */}
                {isExpanded && (
                    <div className="bg-black/40 border-t border-slate-800 animate-slide-down">
                        <div className="p-5 space-y-3">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                                <div className="w-1 h-1 bg-indigo-500 rounded-full" /> 시뮬레이션 보정 근거 (Logic Trace)
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {r.trace && r.trace.length > 0 ? r.trace.map((t, tidx) => (
                                    <div key={tidx} className="flex items-center justify-between py-2 px-3 bg-slate-900/50 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                        <span className="text-[12px] font-black text-slate-400">{t.factor}</span>
                                        <span className={`text-[12px] font-black tabular-nums ${t.impact.includes('-') ? 'text-emerald-400' : t.impact.includes('+') ? 'text-rose-400' : 'text-slate-200'}`}>
                                            {t.impact}
                                        </span>
                                    </div>
                                )) : (
                                    <div className="text-center py-4 text-slate-600 text-[10px] font-bold italic tracking-wide">
                                        기초 능력치 기반 연산됨
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (!race || !race.horses) {
        return (
            <div className="bg-[#0b0f1a] border border-slate-800 rounded-[44px] h-40 flex items-center justify-center mb-8">
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">시뮬레이션 데이터를 불러오는 중...</p>
            </div>
        );
    }

    return (
        <div className="bg-[#0b0f1a] border border-slate-800 rounded-[44px] overflow-hidden shadow-2xl mb-8 flex flex-col font-sans w-full max-w-full">
            {/* [STRICT UI SYNC] - Forcing Side-by-Side Horizontal Layout */}
            <div className="p-5 md:p-8 lg:p-10 border-b border-slate-800 flex flex-col gap-6 md:gap-8 bg-slate-900/10 backdrop-blur-3xl">
                {/* [FRESH START] - Triggering build in a clean environment */}
                {/* Deployment Test Trigger - Ready to verify responsive header */}
                {/* Row 1: Title (Left) and Tabs (Right) - Responsive Layout */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between w-full gap-5">
                    <div className="flex flex-row items-center gap-4 shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                        <h3 className="text-[22px] font-black text-white tracking-tight leading-none whitespace-nowrap">AI 몬테카를로 시뮬레이션</h3>
                    </div>
                    
                    <div className="bg-[#0f172a] p-1.5 rounded-[22px] flex flex-row items-center border border-slate-800 shadow-inner w-full lg:w-auto">
                        <button 
                            onClick={() => setDisplayMode('track')}
                            className={`flex-1 lg:flex-none px-6 md:px-10 py-2.5 rounded-[18px] text-[13px] font-black transition-all whitespace-nowrap ${displayMode === 'track' ? 'bg-[#4f46e5] text-white shadow-xl' : 'text-slate-500 hover:text-slate-200'}`}
                        >
                            트랙 뷰
                        </button>
                        <button 
                            onClick={() => setDisplayMode('quant')}
                            className={`flex-1 lg:flex-none px-6 md:px-10 py-2.5 rounded-[18px] text-[13px] font-black transition-all whitespace-nowrap ${displayMode === 'quant' ? 'bg-[#4f46e5] text-white shadow-xl' : 'text-slate-500 hover:text-slate-200'}`}
                        >
                            정밀 분석
                        </button>
                    </div>
                </div>

                {/* Row 2: Slider (Left) and Button (Right) - Responsive Layout */}
                <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between w-full gap-5 xl:gap-10">
                    <div className="flex-1 bg-[#0f172a] px-6 md:px-10 py-4 md:py-5 rounded-[32px] border border-slate-800/80 flex flex-row items-center gap-6 md:gap-12 group hover:border-slate-700 transition-all duration-300">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] whitespace-nowrap">주로 함수율</span>
                        <div className="flex-1 flex flex-row items-center gap-8">
                            <input 
                                type="range" min="1" max="25" step="1"
                                value={moisture} onChange={(e) => setMoisture(parseInt(e.target.value))}
                                className="flex-1 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-[#3b82f6] hover:accent-blue-400 transition-all focus:outline-none"
                            />
                            <span className="text-2xl font-black text-[#3b82f6] w-16 text-right tabular-nums tracking-tighter whitespace-nowrap">{moisture}%</span>
                        </div>
                    </div>

                    <button 
                        onClick={runSimulation}
                        disabled={isSimulating}
                        className="bg-white hover:bg-slate-100 disabled:bg-slate-800 text-[#0b0f1a] disabled:text-slate-500 font-black text-[16px] px-8 md:px-20 py-5 md:py-6 rounded-[32px] transition-all shadow-[0_15px_45px_rgba(255,255,255,0.18)] active:scale-[0.96] w-full xl:w-auto xl:min-w-[240px] whitespace-nowrap"
                    >
                        {isSimulating ? "연산 중..." : "시뮬레이션 시작"}
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="p-10 pb-6 relative min-h-[400px]">
                {displayMode === 'track' ? (
                    <div className="relative h-[480px] bg-[#0f172a] rounded-[48px] border border-white/5 overflow-hidden p-10 mb-10 shadow-inner">
                        {/* Track Lines */}
                        <div className="absolute inset-x-0 inset-y-8 flex flex-col justify-around py-6 opacity-5">
                            {[...Array(6)].map((_, i) => <div key={i} className="border-t border-slate-400 w-full" />)}
                        </div>
                        {/* Finish Line positioned at right-[15%] */}
                        <div className="absolute right-[15%] top-0 bottom-0 w-px bg-rose-600/50 flex items-center justify-center">
                            <div className="absolute -top-1 bg-rose-600/30 px-1.5 py-6 rounded-b-xl backdrop-blur-sm">
                                <span className="text-[10px] font-black text-rose-500 [writing-mode:vertical-lr] tracking-[0.4em] uppercase">결승선</span>
                            </div>
                        </div>

                        {race.horses.map((h, idx) => (
                            <div key={h.horse_no} className="absolute transition-all duration-300 ease-out flex items-center"
                                 style={{ left: `${horsePositions[h.horse_no] || 5}%`, top: `${15 + (idx * (70 / (race.horses.length - 1 || 1)))}%`, zIndex: 100 + idx }}>
                                <div className="relative group">
                                    <div className={`w-14 h-12 rounded-[14px] flex items-center justify-center font-black text-lg shadow-2xl border-2 transform transition-all 
                                        ${h.horse_no === simResults[0]?.horse_no 
                                            ? 'bg-[#eab308] border-[#fde047] text-[#0f172a] scale-115 shadow-[0_0_25px_rgba(234,179,8,0.4)]' 
                                            : 'bg-[#1e293b] border-slate-700 text-white'}`}>
                                        {h.horse_no}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* [EMERGENCY FIX] - Status text positioned and Z-indexed to be absolutely visible */}
                        {isRunning && (
                            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[9999] bg-[#4f46e5] px-16 py-5 rounded-full border border-white/30 shadow-[0_30px_70px_rgba(0,0,0,0.8)] pointer-events-none ring-4 ring-indigo-500/20">
                                <span className="text-[14px] font-black text-white uppercase tracking-[0.5em] animate-pulse whitespace-nowrap">
                                    {simPhase === 0 ? "초반 가속 및 포지셔닝" : simPhase === 1 ? "중반 코너링 및 전개" : "마지막 직선 주로 스퍼트"}
                                </span>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Detailed Analysis - 4 Horse Grid (2x2) matching screenshot */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                        {simResults.length > 0 ? (
                            simResults.slice(0, 4).map((r, i) => (
                                <HorseAnalysisCard key={r.horse_no} r={r} index={i} isRanked={true} />
                            ))
                        ) : (
                            <div className="col-span-full h-80 flex flex-col items-center justify-center gap-6 text-slate-700 bg-slate-950/40 rounded-[40px] border border-slate-800/50">
                                <Icon name="activity" size={56} className="text-blue-500/10" />
                                <p className="text-base font-bold opacity-30 tracking-widest uppercase">데이터 분석 결과 대기 중</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Persistent Analysis Section (Always Visible) */}
                <div className="space-y-12 mt-6">
                    <div>
                        <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 pl-2">페이스 붕괴 및 전개 리스크 분석</h4>
                        <div className="p-10 bg-[#0f172a] border border-slate-800/80 rounded-[40px] relative overflow-hidden group">
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
                            <p className="text-[15px] font-bold text-slate-300 leading-[1.9] flex items-center gap-4">
                                {(() => {
                                    const earlyCount = simResults.filter(r => r.style === '선행').length;
                                    let text = "";
                                    
                                    if (moisture <= 10) {
                                        text += "건조 주로의 영향으로 모래가 깊어 선행마들의 체력 소모가 큽니다. ";
                                    } else if (moisture >= 18) {
                                        text += "다습 주로의 영향으로 주로가 단단해져 선행마들의 스피드가 잘 유지되는 유리한 환경입니다. ";
                                    }

                                    if (earlyCount >= 3) {
                                        text += "또한 3두 이상의 선행 경합이 예상되어 초방 페이스 과열에 따른 후반 변수가 클 것으로 분석됩니다.";
                                    } else {
                                        text += "선두권 경합이 치열하지 않아 안정적인 전개가 예상됩니다.";
                                    }
                                    return text;
                                })()}
                            </p>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 pl-2">주요 성능 지표</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-10">
                            <div className="bg-[#0f172a] p-8 rounded-[36px] border border-slate-800/50 group hover:border-blue-900/50 transition-all duration-300">
                                <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mb-3 block">예상 평균 기록</span>
                                <span className="text-3xl font-black text-white leading-none">
                                    {simResults.length > 0 ? (() => {
                                        const totalSecs = simResults[0].expectedTime;
                                        const mins = Math.floor(totalSecs / 60);
                                        const secs = (totalSecs % 60).toFixed(2);
                                        return `${mins}:${secs.padStart(5, '0')}`;
                                    })() : '1:21.12'}
                                </span>
                            </div>
                            <div className="bg-[#0f172a] p-8 rounded-[36px] border border-slate-800/50 group hover:border-blue-900/50 transition-all duration-300">
                                <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mb-3 block">주로 함수율</span>
                                <span className={`text-3xl font-black ${moisture > 15 ? 'text-rose-500' : 'text-blue-500'} leading-none`}>{moisture}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SimulationZone;

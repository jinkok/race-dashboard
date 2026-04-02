import React, { useState, useMemo, useEffect, useRef } from 'react';
import Icon from '../Icon.jsx';
import { AdvancedSimulationEngine } from '../../engines/AdvancedSimulationEngine.js';

const SimulationZone = ({ race, info, loc, trackInfo, statsAnalysis, jockeyStats, trainerStats }) => {
    // 1. 상태 관리
    const [moistureIndex, setMoistureIndex] = useState(10);
    const [simResults, setSimResults] = useState([]);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simPhase, setSimPhase] = useState(0); // 0: Start, 1: Corner, 2: Finish
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [displayMode, setDisplayMode] = useState('track'); // 'track' | 'quant'

    // 2. 경주 변경 시 초기화 로직 (유저 요청 반영)
    useEffect(() => {
        setSimResults([]);
        setProgress(0);
        setSimPhase(0);
        setIsRunning(false);
    }, [race?.race_no, info?.distance]);

    // 3. 엔진 인스턴스
    const engine = useMemo(() => {
        if (!race) return null;
        return new AdvancedSimulationEngine(
            race, 
            loc || 'seoul', 
            trackInfo, 
            statsAnalysis, 
            null, // jockeyStats (now embedded)
            null, // trainerStats (now embedded)
            moistureIndex
        );
    }, [race, loc, trackInfo, statsAnalysis, moistureIndex]);

    // 4. 시뮬레이션 가동 핸들러
    const handleStartSimulation = () => {
        if (!engine) return;
        
        setIsSimulating(true);
        setIsRunning(false);
        setProgress(0);
        setSimPhase(0);

        setTimeout(() => {
            const results = engine.runSimulation();
            setSimResults(results);
            setIsSimulating(false);
            if (displayMode === 'track') startAnimation();
        }, 600);
    };

    // 5. 애니메이션 제어
    const startAnimation = () => {
        setIsRunning(true);
        let p = 0;
        const interval = setInterval(() => {
            p += 1;
            setProgress(p);
            if (p < 30) setSimPhase(0);
            else if (p < 70) setSimPhase(1);
            else setSimPhase(2);

            if (p >= 100) {
                clearInterval(interval);
                setIsRunning(false);
            }
        }, 50);
    };

    // 6. 마필 위치 계산
    const horsePositions = useMemo(() => {
        if (!simResults || simResults.length === 0) return {};
        const positions = {};
        const maxProb = Math.max(...simResults.map(r => r.winProbability));

        simResults.forEach(r => {
            let x = 10;
            if (simPhase === 0) {
                const styleBonus = r.style === 'E' ? 15 : r.style === 'E/P' ? 10 : 0;
                x = 10 + styleBonus + (progress * 0.1);
            } else if (simPhase === 1) {
                const probBonus = (r.winProbability / maxProb) * 20;
                x = 30 + probBonus + ((progress - 30) * 0.8);
            } else {
                const finalPos = 90 - ((maxProb - r.winProbability) / maxProb * 40);
                x = finalPos;
            }
            positions[r.horse_no] = x;
        });
        return positions;
    }, [simResults, simPhase, progress]);

    if (!race) return null;

    return (
        <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl mb-6 animate-in fade-in zoom-in-95 duration-300">
            {/* 상단 컨트롤 바 */}
            <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-900/50 backdrop-blur-md">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-slate-200 font-black text-sm tracking-tight">AI 몬테카를로 시뮬레이션</span>
                    </div>

                    {/* 뷰 모드 토글 */}
                    <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                        <button 
                            onClick={() => setDisplayMode('track')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 ${displayMode === 'track' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <Icon name="map" size={12} /> 트랙 뷰
                        </button>
                        <button 
                            onClick={() => setDisplayMode('quant')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 ${displayMode === 'quant' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <Icon name="bar-chart-3" size={12} /> 정밀 분석
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-700/50">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">주로 함수율</span>
                        <input 
                            type="range" min="0" max="30" value={moistureIndex}
                            onChange={(e) => setMoistureIndex(parseInt(e.target.value))}
                            className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className={`text-[10px] font-black min-w-[24px] ${moistureIndex > 15 ? 'text-rose-400' : 'text-blue-400'}`}>{moistureIndex}%</span>
                    </div>

                    <button 
                        onClick={handleStartSimulation} disabled={isSimulating}
                        className={`flex items-center gap-2 px-5 py-2 rounded-xl font-black text-xs transition-all shadow-lg active:scale-95 ${isSimulating ? 'bg-slate-800 text-slate-500' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
                    >
                        <Icon name={isSimulating ? "loader-2" : "play-circle"} size={14} className={isSimulating ? "animate-spin" : ""} />
                        {isSimulating ? "분석 중..." : "시뮬레이션 시작"}
                    </button>
                </div>
            </div>

            {displayMode === 'track' ? (
                /* --- 트랙 뷰 영역 --- */
                <div className="relative h-60 bg-slate-950 p-4 border-b border-white/5 overflow-hidden">
                    <div className="absolute inset-0 flex flex-col justify-around py-4 opacity-10">
                        {[...Array(6)].map((_, i) => <div key={i} className="border-t border-dashed border-slate-400 w-full" />)}
                    </div>
                    <div className="absolute right-12 top-0 bottom-0 w-px bg-rose-500/30 flex items-center justify-center">
                        <span className="absolute -top-1 text-[8px] font-black text-rose-500/50">결승선</span>
                    </div>

                    {race.horses.map((h, idx) => (
                        <div key={h.horse_no} className="absolute transition-all duration-500 ease-out flex items-center"
                             style={{ left: `${horsePositions[h.horse_no] || 5}%`, top: `${15 + (idx * (70 / (race.horses.length - 1 || 1)))}%`, zIndex: 10 + idx }}>
                            <div className="relative group">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shadow-xl border transform rotate-2 ${h.horse_no === simResults[0]?.horse_no ? 'bg-yellow-500 border-yellow-300 scale-110 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'}`}>
                                    {h.horse_no}
                                </div>
                                {simResults.length > 0 && (
                                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black/90 text-white px-2 py-0.5 rounded text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                        {simResults.find(r => r.horse_no === h.horse_no)?.winProbability.toFixed(1)}%
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isRunning && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-indigo-600 border border-indigo-400/50 px-4 py-1.5 rounded-full shadow-2xl">
                            <span className="text-[9px] font-black text-white uppercase tracking-[0.2em] animate-pulse">
                                {simPhase === 0 ? "초반 가속 주행" : simPhase === 1 ? "중반 코너링 및 전개" : "마지막 직선 주로 스퍼트"}
                            </span>
                        </div>
                    )}
                </div>
            ) : (
                /* --- 퀀트 분석 대시보드 영역 --- */
                <div className="p-6 bg-slate-950/50 min-h-[240px] animate-in fade-in duration-500">
                    {simResults.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                {simResults.slice(0, 4).map((r, i) => (
                                    <div key={r.horse_no} className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl relative overflow-hidden group">
                                        <div className={`absolute top-0 right-0 w-16 h-16 -mr-6 -mt-6 rounded-full opacity-10 group-hover:opacity-20 transition-opacity ${i === 0 ? 'bg-yellow-500' : 'bg-indigo-500'}`} />
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${i === 0 ? 'bg-yellow-500 text-slate-900' : 'bg-slate-800 text-white'}`}>
                                                {r.horse_no}
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{i + 1}위 도달 예상</div>
                                                <div className="text-xs font-black text-white">
                                                    {race?.horses?.find(h => h.horse_no === r.horse_no)?.name || '알 수 없음'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">우승 확률</span>
                                                <span className="text-lg font-black text-white">{r.winProbability.toFixed(1)}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div className={`h-full ${i === 0 ? 'bg-yellow-500' : 'bg-indigo-500'}`} style={{ width: `${r.winProbability}%` }} />
                                            </div>
                                            <div className="flex justify-between text-[9px] font-bold">
                                                <span className="text-slate-500 uppercase">기록 기복(표준편차)</span>
                                                <span className="text-indigo-400">{r.stdDev.toFixed(2)}초</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center gap-3 text-slate-700">
                            <Icon name="activity" size={32} className="opacity-20" />
                            <p className="text-sm font-bold italic tracking-tight opacity-50">상단의 [시뮬레이션 시작] 버튼을 클릭하여 정밀 퀀트 데이터를 산출하세요.</p>
                        </div>
                    )}
                </div>
            )}

            {/* 하단 공통 인사이트 패널 */}
            <div className="p-5 border-t border-slate-800 bg-slate-900 flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Icon name="zap" size={12} className="text-yellow-500" /> 페이스 붕괴 및 전개 리스크 분석
                    </h4>
                    {simResults.length > 0 ? (
                        <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600" />
                            <p className="text-xs font-bold text-slate-300 leading-relaxed">
                                {simResults.filter(r => r.style === 'E').length >= 3 
                                    ? `선행마 ${simResults.filter(r => r.style === 'E').length}두가 경합합니다. 오버페이스 위험이 매우 높으며, 후미 추입마의 역전 가능성이 열려 있는 다이나믹 전개가 예상됩니다.`
                                    : "선행 경쟁군이 적어 비교적 차분한 전개가 예상됩니다. 선두권 마필의 안정적인 버티기 가능성이 높습니다."}
                            </p>
                        </div>
                    ) : (
                        <div className="h-12 bg-slate-950/50 rounded-2xl border border-dashed border-slate-800 flex items-center justify-center text-[10px] text-slate-600 font-bold uppercase">분석 대기 중...</div>
                    )}
                </div>
                <div className="flex-shrink-0 md:w-48">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">주요 성능 지표</h4>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                            <div className="text-[8px] text-slate-500 font-bold uppercase mb-1">예상 평균 기록</div>
                            <div className="text-xs font-black text-slate-200">
                                {simResults.length > 0 ? `${Math.floor(simResults[0].expectedTime / 60)}:${(simResults[0].expectedTime % 60).toFixed(2)}` : '--:--'}
                            </div>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                            <div className="text-[8px] text-slate-500 font-bold uppercase mb-1">주로 함수율</div>
                            <div className={`text-xs font-black ${moistureIndex > 15 ? 'text-rose-400' : 'text-blue-400'}`}>{moistureIndex}%</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SimulationZone;

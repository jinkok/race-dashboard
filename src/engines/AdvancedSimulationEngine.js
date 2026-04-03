import { MonteCarloSimulator } from "./MonteCarloEngine.js";
import { PaceAndTacticsAnalyzer } from "./PaceAndTacticsAnalyzer.js";

/**
 * 차세대 몬테카를로 시뮬레이션 메인 엔진
 * (Advanced Data-Driven Simulation Engine)
 */
export class AdvancedSimulationEngine {
    /**
     * @param {Object} race - 현재 레이스 객체 (distance, horses 등 포함)
     * @param {string} location - 지역 (seoul, busan_gyeongnam)
     * @param {Object} trackInfo - race_track_info.json 
     * @param {Object} statsAnalysis - Merged_Race_Data 의 stats_analysis 
     * @param {Object} sireInfo - sire_info.json (혈통 성능 지표)
     * @param {Object} jockeyStats - jockey_stats_....json 
     * @param {Object} trainerStats - trainer_stats_....json
     * @param {number} moistureIndex - 트랙 함수율 (초기값 10%)
     */
    constructor(race, location, trackInfo, statsAnalysis, sireInfo, jockeyStats, trainerStats, moistureIndex = 10) {
        this.race = race;
        this.location = location;
        
        // Data Sources
        this.trackInfo = trackInfo;
        this.statsAnalysis = statsAnalysis;
        this.sireInfo = sireInfo;
        this.jockeyStats = jockeyStats;
        this.trainerStats = trainerStats;
        
        // Dynamic Parameters
        this.moistureIndex = moistureIndex;

        // Sub-Engines
        this.paceAnalyzer = new PaceAndTacticsAnalyzer(trackInfo, statsAnalysis);
        this.mcEngine = new MonteCarloSimulator(10000); // 10,000 iterations
    }

    /**
     * 함수율 동적 변경
     */
    setMoistureIndex(moisture) {
        this.moistureIndex = parseFloat(moisture) || 10;
    }

    /**
     * 시뮬레이션 실행 파이프라인
     */
    runSimulation() {
        if (!this.race || !this.race.horses) return [];

        const distance = parseInt(this.race.distance || this.race.race_info?.distance) || 1200;
        const horses = this.race.horses;
        const raceClass = this.race.race_info?.class || "";
        const isHandicap = this.race.race_info?.conditions?.includes("핸디캡");
        const isStakes = raceClass.includes("대상") || this.race.race_info?.conditions?.includes("대상");

        // Helper: Convert class name to numeric rank (lower is higher/faster)
        const getClassNum = (cls) => {
            if (!cls) return 99;
            if (cls.includes("대상")) return 0;
            const m = cls.match(/\d+/);
            return m ? parseInt(m[0]) : 99;
        };
        const currentClassNum = getClassNum(raceClass);

        // 1. 전개 분석 (런 스타일 분류)
        const runStyles = horses.map(h => this.paceAnalyzer.classifyRunStyle(h));
        
        // 2. 선행 경합 페널티 (Lead Conflict Map)
        const conflictPenalty = this.paceAnalyzer.calculateLeadConflictPenalty(runStyles);

        // 3. 기대 스피드 및 분산 연산 (추론 파트)
        const simItems = horses.map((h, index) => {
            const styleRaw = runStyles[index];
            const style = styleRaw === 'E' ? '선행' : styleRaw === 'P' ? '선입' : styleRaw === 'S' ? '추입' : '선행/선입';
            const trace = []; // Logic Trace Logs (Korean)
            let bestRec = { speed: 999, record: "" }; // Initialize early to avoid ReferenceError
            
            // --- [NEW] Section 1: Base Ability (말 자체의 기초 능력) ---
            let rawAbilityTime = 0;
            let abilitySource = "";
            
            // 1.1 Competitive History Check (가장 잘 뛴 실전 기록 찾기)
            const competitiveHist = h.recent_history?.filter(r => !r.class?.includes("주행")) || [];
            
            if (competitiveHist.length > 0) {
                // 실전 기록 중 단위 거리당 가장 빠른 기록 선택 (최고 능력치 추출)
                bestRec = competitiveHist.reduce((best, cur) => {
                    if (!cur.record || !cur.record.includes(':')) return best;
                    const secs = parseInt(cur.record.split(':')[0]) * 60 + parseFloat(cur.record.split(':')[1]);
                    const dStr = String(cur.distance || "").replace(/\D/g, '');
                    const distVal = parseInt(dStr) || distance;
                    const speed = secs / distVal;
                    return (speed < best.speed) ? { speed, record: cur.record } : best;
                }, { speed: 999, record: "" });
                
                if (bestRec.speed !== 999) {
                    rawAbilityTime = bestRec.speed * distance;
                    abilitySource = "실전 기록";
                }
            }
            
            // 1.2 Fallback to Trial (실전 기록 없으면 주행심사)
            const trialHist = h.recent_history?.filter(r => r.class?.includes("주행")) || [];
            if (rawAbilityTime === 0 && trialHist.length > 0) {
                const trialRec = trialHist[0];
                if (trialRec.record && trialRec.record.includes(':')) {
                    const secs = parseInt(trialRec.record.split(':')[0]) * 60 + parseFloat(trialRec.record.split(':')[1]);
                    const dist = parseInt(trialRec.distance?.replace(/\D/g, '')) || distance;
                    rawAbilityTime = (secs / dist) * distance + 0.5; // 연습은 실전보다 0.5초 느리다고 가정
                    abilitySource = "연습(주행심사)";
                }
            }
            
            // 1.3 Default to Class Average (기록 전혀 없으면 등급 평균)
            let baseMeanTime = distance / 16.5; 
            if (this.statsAnalysis?.avg_record && this.statsAnalysis.avg_record.includes(':')) {
                const [min, sec] = this.statsAnalysis.avg_record.split(':');
                baseMeanTime = (parseInt(min) * 60) + parseFloat(sec);
            }
            
            if (rawAbilityTime === 0) {
                rawAbilityTime = baseMeanTime;
                abilitySource = "등급 평균";
            }

            // 능력치 표시: 등급 평균 대비 우수성 계산
            const diffFromAvg = rawAbilityTime - baseMeanTime;
            const abilityInfo = `${rawAbilityTime.toFixed(1)}s (${diffFromAvg <= 0 ? '-' : '+'}${Math.abs(diffFromAvg).toFixed(1)}s)`;
            
            trace.push({ 
                factor: `기능(${abilitySource})`, 
                impact: abilityInfo
            });

            let meanTime = rawAbilityTime;

            // --- [NEW] Section 2: Sire Aptitude (혈통 보정) ---
            if (h.sire && this.sireInfo) {
                const sInfo = this.sireInfo.find(s => s.kr === h.sire || s.en === h.sire);
                if (sInfo) {
                    let aptitudeBonus = 0;
                    const distCat = distance <= 1200 ? "Sprint" : distance <= 1600 ? "Mile" : "Middle";
                    
                    if (sInfo.distance.includes(distCat)) {
                        aptitudeBonus = -0.3; // 적성 거리 보너스
                        trace.push({ factor: "혈통 적성", impact: "보너스" });
                    } else if ((distCat === "Middle" && sInfo.distance === "Sprint") || (distCat === "Sprint" && sInfo.distance === "Middle")) {
                        aptitudeBonus = 0.5; // 부적성 거리 페널티
                        trace.push({ factor: "혈통 부적합", impact: "페널티" });
                    }
                    meanTime += aptitudeBonus;
                }
            }

            // [NEW] Endurance & Distance Decay Physics
            const hist = h.recent_history?.[0];
            const currentWeight = parseFloat(h.weight) || 54.0;
            const distDiff = Math.max(0, distance - (parseInt(hist?.distance?.replace(/\D/g, '')) || distance));
            const horseAge = parseInt(h.age) || 3;
            const careerHist = h.recent_history || [];
            
            // 1. Endurance Index (G1F 효율) - 후반 끈기 분석
            let g1fEfficiency = 0.5; // Default neutral
            if (hist && hist.g1f && hist.g1f !== "-") {
                const g1f = parseFloat(hist.g1f);
                // G1F 13.5초를 기준으로 빠를수록 효율 상승 (지구력 보너스)
                g1fEfficiency = Math.max(0, Math.min(1, (14.5 - g1f) / 2.0)); 
                if (g1fEfficiency > 0.7) trace.push({ factor: "지구력 우수", impact: "보너스" });
                else if (g1fEfficiency < 0.3) trace.push({ factor: "지구력 부족", impact: "페널티" });
            }

            // 2. [NEW] Weight Delta Sensitivity (부중 변화 민감도)
            const prevWeight = parseFloat(hist?.weight) || currentWeight;
            const weightDelta = currentWeight - prevWeight;
            const hasHighWeightSuccess = careerHist.some(r => parseFloat(r.weight) >= 56 && parseInt(r.rank) <= 3);

            if (weightDelta < 0) {
                const weightBonus = Math.abs(weightDelta) * 0.15;
                meanTime -= weightBonus;
                trace.push({ factor: "부중 감량", impact: `-${weightBonus.toFixed(2)}s` });
            } else if (weightDelta > 0) {
                let weightPenalty = weightDelta * 0.2;
                if (hasHighWeightSuccess) {
                    weightPenalty *= 0.5; // 부중 극복력 우수마는 페널티 절반 감면
                    trace.push({ factor: "부중 극복력", impact: "페널티감면" });
                }
                meanTime += weightPenalty;
                trace.push({ factor: "부중 증가", impact: `+${weightPenalty.toFixed(2)}s` });
            }

            // 3. Weight-Distance Compounded Penalty (무거울수록 장거리에서 더 지침)
            const extraWeight = Math.max(0, currentWeight - 53.0);
            const weightDistPenalty = extraWeight * (distance / 1000) * 0.08; 
            if (weightDistPenalty > 0.1) {
                meanTime += weightDistPenalty;
                trace.push({ factor: "고부중/거리", impact: `+${weightDistPenalty.toFixed(2)}s` });
            }

            // [NEW] 대상경주 전체 페이스 보정
            if (isStakes) {
                meanTime -= 0.2;
                trace.push({ factor: "대상경주", impact: "-0.2s" });
            }
            
            // 특성 1: 과거 기록 기반 보정 (History Weighting + Fatigue Curve)
            if (hist && hist.record && hist.record.includes(':')) {
                const parts = hist.record.split(':');
                const histSecs = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
                const histDist = parseInt(hist.distance?.replace(/\D/g, '')) || distance;
                const isTrial = hist.class?.includes("주행");
                const isHistStakes = hist.class?.includes("대상");
                
                const speedPerM = histSecs / histDist;
                let estTime = speedPerM * distance;

                // [NEW] Fatigue Curve: 거리가 늘어남에 따른 속도 저하 시뮬레이션
                if (distDiff > 0) {
                    const fatigueDelay = (distDiff / 100) * (0.25 - (g1fEfficiency * 0.15));
                    estTime += fatigueDelay;
                    trace.push({ factor: "거리연장 피로", impact: `+${fatigueDelay.toFixed(2)}s` });
                }

                // Weighting Logic
                if (isTrial) {
                    meanTime = (meanTime * 0.8) + (estTime * 0.2);
                    trace.push({ factor: "주행심사 참고", impact: "비중낮춤" });
                } else if (isHistStakes) {
                    meanTime = (meanTime * 0.4) + (estTime * 0.6) - 0.2;
                    trace.push({ factor: "대상전적 우수", impact: "가점" });
                } else {
                    meanTime = (meanTime + estTime) / 2;
                }
            }

            // [NEW] 승급전 / 강급전 보정 (Class Status)
            if (h.grade) {
                const horseClassNum = getClassNum(h.grade);
                if (currentClassNum < horseClassNum) {
                    meanTime += 0.4; 
                    trace.push({ factor: "승급전", impact: "+0.4s" });
                } else if (currentClassNum > horseClassNum) {
                    meanTime -= 0.3; 
                    trace.push({ factor: "강급전", impact: "-0.3s" });
                }
            }

            // 특성 2: 트랙 함수율 (Track Moisture Bias)
            if (this.moistureIndex > 15) {
                if (styleRaw === 'E' || styleRaw === 'E/P') {
                    meanTime -= 0.5;
                    trace.push({ factor: "포장트랙(선행)", impact: "-0.5s" });
                }
                if (styleRaw === 'P' || styleRaw === 'S') {
                    meanTime += 0.8;
                    trace.push({ factor: "킥백페널티(추입)", impact: "+0.8s" });
                }
            }

            // 특성 3: 게이트 및 지오메트리 보정
            const gatePenalty = this.paceAnalyzer.calculateGateBias(distance, this.location, h.horse_no, styleRaw);
            if (Math.abs(gatePenalty) > 0.05) {
                meanTime += gatePenalty;
                trace.push({ factor: "게이트편차", impact: `${gatePenalty > 0 ? '+' : ''}${gatePenalty.toFixed(2)}s` });
            }

            // 특성 4: 선행마 오버페이스
            if (styleRaw === 'E' || styleRaw === 'E/P') {
                if (conflictPenalty > 0) {
                    meanTime += conflictPenalty;
                    trace.push({ factor: "선행경합", impact: `+${conflictPenalty.toFixed(2)}s` });
                }
            } else if (styleRaw === 'S' && conflictPenalty > 0) {
                const bonus = (conflictPenalty * 0.8);
                meanTime -= bonus;
                trace.push({ factor: "전개반사이익", impact: `-${bonus.toFixed(2)}s` });
            }

            // [NEW] 특성 5: 인적 시너지 (기수 고도화 로직)
            let humanSynergy = 0;
            const currentJockey = h.jockey;
            
            // 5.1 Jockey Stats Impact
            const jStats = h.jockey_stats || (this.jockeyStats && this.jockeyStats[currentJockey]);
            if (jStats) {
                const jWin = parseFloat(jStats.recent_stats?.win_rate || jStats.career?.win_rate || 10);
                let jImpact = (jWin - 10) * 0.02;
                
                // [NEW] 신예마(2~3세) '기수빨' 적용 (영향력 2배)
                if (horseAge <= 3 || careerHist.length < 3) {
                    jImpact *= 2.0;
                    trace.push({ factor: "기수시너지", impact: "신예버프" });
                }
                humanSynergy += jImpact;
            }

            // 5.2 [NEW] Jockey Chemistry (찰떡궁합 - Partnership history)
            const partnershipSuccess = careerHist.some(r => r.jockey === currentJockey && parseInt(r.rank) <= 3);
            const partnershipRides = careerHist.filter(r => r.jockey === currentJockey).length;
            
            if (partnershipSuccess) {
                humanSynergy += 0.25; // 찰떡궁합 보너스
                trace.push({ factor: "찰떡궁합", impact: "동반입상" });
            } else if (partnershipRides >= 3) {
                humanSynergy += 0.1; // 오랜 호흡
                trace.push({ factor: "오랜호흡", impact: "보너스" });
            }

            const tStats = h.trainer_stats || (this.trainerStats && this.trainerStats[h.trainer]);
            if (tStats) {
                const tWin = parseFloat(tStats.recent_stats?.win_rate || tStats.career?.win_rate || 10);
                const tImpact = (tWin - 10) * 0.01;
                humanSynergy += tImpact;
            }

            if (Math.abs(humanSynergy) > 0.05) {
                meanTime -= humanSynergy;
                trace.push({ factor: "인적시너지", impact: `${humanSynergy > 0 ? '우수' : '부족'}` });
            }

            // 4. 표준편차 (Standard Deviation - Volatility)
            let stdDev = 0.8; 
            if (styleRaw === 'S') stdDev = 1.3;
            else if (styleRaw === 'P') stdDev = 1.0;
            else if (styleRaw === 'E/P') stdDev = 0.6;
            else if (styleRaw === 'E') stdDev = 0.7;

            // [NEW] 연령/경험별 변동성 조절
            if (horseAge >= 4 && careerHist.length >= 10) {
                stdDev *= 0.9; // 베테랑의 안정감
                trace.push({ factor: "베테랑", impact: "기록안정" });
            } else if (partnershipRides === 0 && horseAge <= 3) {
                stdDev *= 1.15; // 첫 호흡 신예마의 불확실성
                trace.push({ factor: "첫호흡", impact: "변동성↑" });
            }

            // [NEW] 핸디캡 경주 불확실성 증폭
            if (isHandicap) {
                stdDev *= 1.2;
                trace.push({ factor: "핸디캡(변동성)", impact: "증폭" });
            }

            if (h.steward_trip_note?.note?.includes("출발늦음")) {
                stdDev += 0.4;
                trace.push({ factor: "늦발이력", impact: "변동성↑" });
            }

            return {
                id: h.horse_no,
                meanTime: meanTime,
                stdDev: stdDev,
                style: style,
                trace: trace,
                bestRecord: bestRec.record || "기록 없음",
                abilityInfo: abilityInfo
            };
        });

        // 5. 몬테카를로 난수 실행 (결과 집계)
        const mcResults = this.mcEngine.run(simItems);

        // 6. 결과 조합 및 정렬
        return Object.keys(mcResults).map(id => {
            const item = simItems.find(i => i.id == id);
            return {
                horse_no: parseInt(id),
                winProbability: mcResults[id].winProbability,
                expectedTime: mcResults[id].simulatedMeanTime,
                baseMeanTime: mcResults[id].baseMeanTime,
                style: item.style,
                stdDev: item.stdDev,
                trace: item.trace,
                bestRecord: item.bestRecord,
                abilityInfo: item.abilityInfo
            };
        }).sort((a, b) => b.winProbability - a.winProbability);
    }
}

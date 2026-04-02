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
     * @param {Object} jockeyStats - jockey_stats_....json 
     * @param {Object} trainerStats - trainer_stats_....json
     * @param {number} moistureIndex - 트랙 함수율 (초기값 10%)
     */
    constructor(race, location, trackInfo, statsAnalysis, jockeyStats, trainerStats, moistureIndex = 10) {
        this.race = race;
        this.location = location;
        
        // Data Sources
        this.trackInfo = trackInfo;
        this.statsAnalysis = statsAnalysis;
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
            const style = runStyles[index];
            
            // Base Expected Time: Use class-based 'avg_record'
            let baseMeanTime = distance / 16.5; 
            if (this.statsAnalysis?.avg_record && this.statsAnalysis.avg_record.includes(':')) {
                const [min, sec] = this.statsAnalysis.avg_record.split(':');
                baseMeanTime = (parseInt(min) * 60) + parseFloat(sec);
            }
            
            let meanTime = baseMeanTime;

            // [NEW] 대상경주 전체 페이스 보정 (-0.2s Faster)
            if (isStakes) meanTime -= 0.2;
            
            // 특성 1: 과거 기록 기반 보정 (History Weighting)
            if (h.recent_history && h.recent_history.length > 0) {
                const hist = h.recent_history[0];
                const histTimeStr = hist.record;
                const isTrial = hist.class?.includes("주행");
                const isHistStakes = hist.class?.includes("대상");

                if (histTimeStr && histTimeStr.includes(':')) {
                    const parts = histTimeStr.split(':');
                    const histSecs = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
                    const histDist = parseInt(hist.distance?.replace(/\D/g, '')) || distance;
                    const speedPerM = histSecs / histDist;
                    const estTime = speedPerM * distance;

                    // Weighting Logic
                    if (isTrial) {
                        // Trial is practice, low weight (80% class average, 20% trial)
                        meanTime = (meanTime * 0.8) + (estTime * 0.2);
                    } else if (isHistStakes) {
                        // Stakes is high intensity, high weight
                        meanTime = (meanTime * 0.4) + (estTime * 0.6) - 0.2;
                    } else {
                        // Standard race (50/50 mix)
                        meanTime = (meanTime + estTime) / 2;
                    }
                }
            }

            // [NEW] 승급전 / 강급전 보정 (Class Status)
            if (h.grade) {
                const horseClassNum = getClassNum(h.grade);
                if (currentClassNum < horseClassNum) {
                    // Jumping to a faster/higher class (Promotion)
                    meanTime += 0.4; // +0.4s Class Barrier Penalty
                } else if (currentClassNum > horseClassNum) {
                    // Dropping to a slower/lower class (Demotion)
                    meanTime -= 0.3; // -0.3s Class Advantage Bonus
                }
            }

            // 특성 2: 트랙 함수율 (Track Moisture Bias)
            if (this.moistureIndex > 15) {
                if (style === 'E' || style === 'E/P') meanTime -= 0.5;
                if (style === 'P' || style === 'S') meanTime += 0.8;
            }

            // 특성 3: 게이트 및 지오메트리 보정
            const gatePenalty = this.paceAnalyzer.calculateGateBias(distance, this.location, h.horse_no, style);
            meanTime += gatePenalty;

            // 특성 4: 선행마 오버페이스
            if (style === 'E' || style === 'E/P') {
                meanTime += conflictPenalty;
            } else if (style === 'S' && conflictPenalty > 0) {
                meanTime -= (conflictPenalty * 0.8);
            }

            // 특성 5: 인적 시너지
            let humanSynergy = 0;
            const jStats = h.jockey_stats || (this.jockeyStats && this.jockeyStats[h.jockey]);
            if (jStats) {
                const jWin = parseFloat(jStats.recent_stats?.win_rate || jStats.career?.win_rate || 10);
                humanSynergy += (jWin - 10) * 0.02;
            }
            const tStats = h.trainer_stats || (this.trainerStats && this.trainerStats[h.trainer]);
            if (tStats) {
                const tWin = parseFloat(tStats.recent_stats?.win_rate || tStats.career?.win_rate || 10);
                humanSynergy += (tWin - 10) * 0.01;
            }
            meanTime -= humanSynergy;

            // 4. 표준편차 (Standard Deviation - Volatility)
            let stdDev = 0.8; 
            if (style === 'S') stdDev = 1.3;
            else if (style === 'P') stdDev = 1.0;
            else if (style === 'E/P') stdDev = 0.6;
            else if (style === 'E') stdDev = 0.7;

            // [NEW] 핸디캡 경주 불확실성 증폭 (+20%)
            if (isHandicap) stdDev *= 1.2;

            if (h.steward_trip_note?.note?.includes("출발늦음")) stdDev += 0.4;

            return {
                id: h.horse_no,
                meanTime: meanTime,
                stdDev: stdDev,
                style: style
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
                stdDev: item.stdDev
            };
        }).sort((a, b) => b.winProbability - a.winProbability);
    }
}

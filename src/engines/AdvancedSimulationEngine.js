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

        // 1. 전개 분석 (런 스타일 분류)
        const runStyles = horses.map(h => this.paceAnalyzer.classifyRunStyle(h));
        
        // 2. 선행 경합 페널티 (Lead Conflict Map)
        const conflictPenalty = this.paceAnalyzer.calculateLeadConflictPenalty(runStyles);

        // 3. 기대 스피드 및 분산 연산 (추론 파트)
        const simItems = horses.map((h, index) => {
            const style = runStyles[index];
            
            // Base Expected Time: Use class-based 'avg_record' from statsAnalysis if available, 
            // otherwise fallback to distance-based calculation.
            let baseMeanTime = distance / 16.5; 
            if (this.statsAnalysis?.avg_record && this.statsAnalysis.avg_record.includes(':')) {
                const [min, sec] = this.statsAnalysis.avg_record.split(':');
                baseMeanTime = (parseInt(min) * 60) + parseFloat(sec);
            }
            
            let meanTime = baseMeanTime;
            
            // 특성 1: 과거 G1F, G3F, S1F 기반 보정
            if (h.recent_history && h.recent_history.length > 0) {
                const hist = h.recent_history[0];
                const histTimeStr = hist.record; // "1:15.5" -> 초로 변환
                if (histTimeStr && histTimeStr.includes(':')) {
                    const parts = histTimeStr.split(':');
                    const histSecs = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
                    const histDist = parseInt(hist.distance?.replace(/\\D/g, '')) || distance;
                    
                    // 과거 속도 비율을 현재 거리에 매핑하여 기준 시간보다 약간 더 정교하게 보정
                    const speedPerM = histSecs / histDist;
                    meanTime = (meanTime + (speedPerM * distance)) / 2; // 평활화(Smoothing)
                }
            }

            // 특성 2: 트랙 함수율 (Track Moisture Bias)
            // 수분이 과다(15% 초과)할 경우 표면이 단단해져 E 성향 마필은 빨라지고 S 성향 추입마는 킥백으로 부진
            if (this.moistureIndex > 15) {
                if (style === 'E' || style === 'E/P') meanTime -= 0.5; // 패스트 트랙 호주행
                if (style === 'P' || style === 'S') meanTime += 0.8; // 킥백 및 미끄러짐
            }

            // 특성 3: 게이트 및 지오메트리 보정
            const gatePenalty = this.paceAnalyzer.calculateGateBias(distance, this.location, h.horse_no, style);
            meanTime += gatePenalty;

            // 특성 4: 선행마 오버페이스 (페이스 맵 붕괴)
            if (style === 'E' || style === 'E/P') {
                meanTime += conflictPenalty; // 페널티 부과
            } else if (style === 'S' && conflictPenalty > 0) {
                // 선행마 붕괴 시 추입마 역전 보너스
                meanTime -= (conflictPenalty * 0.8);
            }

            // 특성 5: 인적 시너지 (Embedded Stats 우선 참조)
            let humanSynergy = 0;
            
            // 기수(Jockey) 보정
            const jStats = h.jockey_stats || (this.jockeyStats && this.jockeyStats[h.jockey]);
            if (jStats) {
                const jWin = parseFloat(jStats.recent_stats?.win_rate || jStats.career?.win_rate || 10);
                humanSynergy += (jWin - 10) * 0.02; // 평균(10%) 대비 기여도
            }
            
            // 조교사(Trainer) 보정
            const tStats = h.trainer_stats || (this.trainerStats && this.trainerStats[h.trainer]);
            if (tStats) {
                const tWin = parseFloat(tStats.recent_stats?.win_rate || tStats.career?.win_rate || 10);
                humanSynergy += (tWin - 10) * 0.01;
            }
            
            meanTime -= humanSynergy; // 시너지가 높을수록 시간 단축

            // 4. 표준편차 (Standard Deviation - Volatility 구성)
            // 일관성 없는 마필(S/P)은 분산이 크고, 선행(E/EP)은 기록이 일정함
            let stdDev = 0.8; 
            if (style === 'S') stdDev = 1.3; // 터지면 우승, 안터지면 꼴찌
            else if (style === 'P') stdDev = 1.0;
            else if (style === 'E/P') stdDev = 0.6; // 유도리 있는 안정성
            else if (style === 'E') stdDev = 0.7; // 경합 리스크 포함

            // 출발 늦음 잦은 마필 분산 증폭
            if (h.steward_trip_note?.note?.includes("출발늦음")) {
                stdDev += 0.4;
            }

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

import { DefaultTuningConfig } from "./TuningConfig.js";

/**
 * 전개 성향 및 페이스 맵 시나리오 분석 엔진
 * (Pace and Tactics Analyzer v2.0)
 */

export class PaceAndTacticsAnalyzer {
    constructor(trackInfo, statsAnalysis, customConfig = null) {
        this.trackInfo = trackInfo; // race_track_info.json
        this.statsAnalysis = statsAnalysis; // Merged_Race_Data.stats_analysis
        this.config = customConfig ? { ...DefaultTuningConfig, ...customConfig } : DefaultTuningConfig;
    }

    /**
     * 경마 전개 스타일 분류 (E, E/P, P, S)
     */
    classifyRunStyle(horse) {
        const s1fRecord = horse.recent_history?.[0]?.s1f;
        const s1f = s1fRecord ? parseFloat(s1fRecord) : 14.0;
        
        let isFastStart = false;
        if (this.statsAnalysis && this.statsAnalysis.fast_start_horses) {
            isFastStart = this.statsAnalysis.fast_start_horses.some(h => h.no === horse.horse_no);
        } else {
            isFastStart = s1f < 13.8;
        }

        const isLateStart = horse.steward_trip_note?.note?.includes("출발늦음");
        if (isLateStart) return 'S'; 

        if (isFastStart && s1f <= 13.8) return 'E';
        if (isFastStart || s1f <= 14.1) return 'E/P';
        if (s1f <= 14.5) return 'P';
        
        return 'S';
    }

    /**
     * 게이트 편향치 (Draw Bias) - TuningConfig의 'Premium' 외의 일반적인 외곽 페널티
     */
    calculateGateBias(distance, location, horseNo, runStyle) {
        let penalty = 0;
        
        // 단거리 외곽 페널티 (TuningConfig 반영 전 기본 지오메트리 보정)
        if (distance <= this.config.gate.shortDistanceLimit) {
            if (horseNo > 8) {
                penalty = (horseNo - 8) * 0.12; 
            }
            // 선행마는 외곽이라도 파고들기 능력이 있음
            if (runStyle === 'E' && penalty > 0) {
                penalty *= 0.5;
            }
        }
        
        return penalty;
    }

    /**
     * 선행 경합 엔진 (Lead Conflict Engine)
     */
    calculateLeadConflictPenalty(allRunStyles) {
        const earlyCount = allRunStyles.filter(s => s === 'E').length;
        if (earlyCount >= 3) {
            return (earlyCount - 2) * 0.20; 
        }
        return 0;
    }
}

/**
 * 전개 성향 및 페이스 맵 시나리오 분석 엔진
 * (Pace and Tactics Analyzer)
 */

export class PaceAndTacticsAnalyzer {
    constructor(trackInfo, statsAnalysis) {
        this.trackInfo = trackInfo; // race_track_info.json (트랙 지오메트리)
        this.statsAnalysis = statsAnalysis; // Merged_Race_Data.stats_analysis (사전 계산된 최고 속도 마필들)
    }

    /**
     * 경마 전개 스타일 분류 (E, E/P, P, S)
     * E (Early): 선행형 (초반이 매우 중요)
     * E/P (Early/Presser): 선입형 (앞에서 따라가는 유연성)
     * P (Presser): 선입/추입형 (중반에서 치고 나옴)
     * S (Sustain/Closer): 추입형 (후방 대기 후 결승선 가속)
     * 
     * @param {Object} horse - 현재 마필 객체
     * @returns {string} 전개 성향 (E, E/P, P, S)
     */
    classifyRunStyle(horse) {
        const s1fRecord = horse.recent_history?.[0]?.s1f;
        const s1f = s1fRecord ? parseFloat(s1fRecord) : 14.0; // S1F 평균(14.0)을 기본값으로
        
        let isFastStart = false;
        // 사전 처리된 stats_analysis가 있다면 그것을 신뢰 
        if (this.statsAnalysis && this.statsAnalysis.fast_start_horses) {
            isFastStart = this.statsAnalysis.fast_start_horses.some(h => h.no === horse.horse_no);
        } else {
            // 없을 경우 S1F 자체 임계값으로 평가 (설계서 기준 13.8)
            isFastStart = s1f < 13.8;
        }

        const isLateStart = horse.steward_trip_note?.note?.includes("출발늦음");

        // 최우선 페널티
        if (isLateStart) return 'S'; 

        // 순수 속도와 통계를 결합한 전략적 분류
        if (isFastStart && s1f <= 13.8) return 'E'; // 엘리트 선행마
        if (isFastStart || s1f <= 14.1) return 'E/P'; // 선입 가능마
        if (s1f <= 14.5) return 'P'; // 중상위권 추격
        
        return 'S'; // 후미 추입마
    }

    /**
     * 게이트 편향치 (Draw Bias) 및 곡선로 상쇄 로직 계산
     * @param {number} distance - 경주 거리 (m)
     * @param {string} location - 경마장 이름 (seoul, busan_gyeongnam)
     * @param {number} horseNo - 마번 (게이트)
     * @param {string} runStyle - 주행 스타일
     * @returns {number} 예상 시간 증감치 (초) - 낮을수록 유리
     */
    calculateGateBias(distance, location, horseNo, runStyle) {
        let penalty = 0;
        let trackData = null;
        
        // 지오메트리 존재 시
        if (this.trackInfo && this.trackInfo.racecourses) {
            trackData = this.trackInfo.racecourses[location];
        }
        
        // 1000m, 1200m 단거리에서는 게이트 번호에 따른 페널티 증가
        if (distance <= 1200) {
            if (horseNo > 8) {
                penalty = (horseNo - 8) * 0.15; // 외곽일수록 시간 지연 (1초 = 약 16m)
            }
            // 설계서 3.2 게이트 상쇄 로직: 스피드가 아주 빠른 선행마(E)는 파고들기 능력이 있어 외곽 페널티 상진
            if (runStyle === 'E' && penalty > 0) {
                penalty = penalty * 0.4; // 60% 페널티 삭감
            }
        } else if (distance >= 1800) {
            // 장거리는 코너 진입 전 안쪽 자리를 잡을 시간이 충분하므로 페널티 대폭 감소
            if (horseNo > 10) {
                penalty = (horseNo - 10) * 0.05; 
            }
        }
        
        // 인코스 단독 선행 어드밴티지 (1~3번 게이트)
        if (horseNo <= 3 && runStyle === 'E') {
            penalty -= 0.2; // 0.2초 단축 보너스
        }

        return penalty;
    }

    /**
     * 선행 경합 엔진 (Lead Conflict Engine) 계산
     * @param {Array<string>} allRunStyles - 해당 레이스에 출전하는 전체 마필의 전개 성향 배열
     * @returns {number} 경합으로 인한 오버페이스 페널티 타임 (초) - 종반 기록(G1F)에 더해질 체력 고갈분
     */
    calculateLeadConflictPenalty(allRunStyles) {
        // E 스타일 마필 수 카운트
        const earlyCount = allRunStyles.filter(s => s === 'E').length;
        
        // 선두 경쟁이 치열해질 수록(3두 이상) 페이스가 붕괴됨 (Pace Meltdown)
        if (earlyCount >= 3) {
            // E와 E/P에게 주어지는 후반부 처짐 페널티
            return (earlyCount - 2) * 0.25; // 3두: 0.25초 추가, 4두: 0.5초 등..
        }
        return 0;
    }
}

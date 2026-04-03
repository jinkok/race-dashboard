/**
 * KRA Advanced Simulation Engine Tuning Configuration
 * 
 * 이 파일은 시뮬레이션 엔진의 보정 계수(Weight)들을 관리합니다.
 * 향후 대시보드 UI나 머신러닝 최적화 프로세스에서 이 값을 동적으로 변경할 수 있습니다.
 */

export const DefaultTuningConfig = {
    // 1. 게이트 프리미엄 (단거리 내측 유리)
    gate: {
        shortDistanceLimit: 1400, // 이 거리 이하일 때만 내측 프리미엄 적용
        insideGateMax: 3,         // 1~3번 게이트를 내측으로 정의
        timeAdvantageSec: 0.3     // 내측 게이트 획득 시 최대 단축 초 (1번 기준)
    },

    // 2. 마체중 변동성 (리스크 증가)
    weight: {
        changeThreshold: 15,      // ±15kg 이상 변동 시 급변으로 간주하여 리스크 부여
        stdDevMultiplier: 1.25,   // 표준편차(리스크) 증폭 비율
        baseWeight: 54.0,         // 기준 기수 부중 (kg)
        impactPerKg: 0.15,        // 1kg당 시간 증감 (초)
        heavyThreshold: 56.0,     // '고부중' 판정 기준 (KRA 실전 데이터 기준)
        bearerBonus: 0.25         // 고부중 입상 경험 시 민감도 할인율 (25%)
    },

    // 3. 함수율 및 각질 보정 (Track Bias)
    trackBias: {
        // 건조 주로 (Heavy Track) -> 추입 유리
        dryThreshold: 6,
        dryCloserAdvSec: 0.25,     // 건조 주로에서 추입마의 상대적 유리함
        dryFrontRiskAdd: 0.15,      // 건조 주로에서 선행마의 스태미너 소모(표준편차 증가)

        // 다습/포화 주로 (Fast Track) -> 선행 유리
        wetThreshold: 15,
        wetFrontAdvSec: 0.4,       // 다습 주로에서 선행마가 기록을 끌어당길 확률
        wetCloserDifficulty: 0.2    // 모래가 다져져 추입마의 역전 거리가 부족해짐(기록 지연)
    },

    // 4. 기수 교체 승부의지 (Jockey Shift)
    jockey: {
        // 기수 등급별 가중치 (S: 4, A: 3, B: 2, C: 1)
        classValues: {
            'S': 4, 'A': 3, 'B': 2, 'C': 1,
            'unknown': 2 // 알 수 없는 경우 기본 B급 가정
        },
        upgradeBonusPerClass: 0.22,   // 클래스 상승 1단계당 단축 초 (승부의지 반영)
        downgradePenaltyPerClass: 0.1 // 클래스 하락 1단계당 지연 초
    },

    // 5. 등급 경쟁력 (Class Competitiveness)
    classCompetitiveness: {
        penaltyThreshold: 1.5,    // 등급 평균보다 1.5초 이상 느릴 경우 페널티 시작
        bonusWeight: 0.25,        // 등급 평균보다 빠를 경우 부여하는 단축 보정치
        riskScale: 1.3            // 등급 열세 시 기복(stdDev) 증폭 비율
    },

    // 6. 거리 대역별 스피드 감쇄 및 적성 (Distance Scaling)
    distanceScaling: {
        baseDecayRate: 0.015,     // 100m 추가 시 거리에 따른 지수적 감쇄율 (%)
        aptitudeBonus: 0.60,      // 거리 적성(입상 경험) 시 감쇄 페널티 할인율 (60%)
        standardDistance: 1200    // 스피드 감쇄가 본격화되는 기준 거리
    },

    // 7. 기타 환경 요인
    env: {
        stakesBonus: 0.2,         // 대상경주 전체 페이스 고조 (단축 초)
        handicapVolatility: 1.2   // 핸디캡 경주의 결과 불확실성 증폭 (stdDev)
    }
};

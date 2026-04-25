/**
 * 📊 USER EMPIRICAL DATA (과거 데이터 분석 기반 보정계수)
 * race-qt-project에서 추출된 통계 기반 상수들입니다.
 */

export const EMPIRICAL_CONFIG = {
    LOCATION: {
        SEOUL: {
            WEIGHT_IMPACT_PER_KG: 0.0878,
            MOISTURE_IMPACT_PER_PCT: -0.1073
        },
        BUSAN: {
            WEIGHT_IMPACT_PER_KG: 0.0809,
            MOISTURE_IMPACT_PER_PCT: -0.1029
        }
    },
    COMMON: {
        STANDARD_MOISTURE: 10,
        SEX_ADJUSTMENT_FACTOR: 0.907
    },
    SCIENTIFIC: {
        LEAD_SUCCESS_REWARD: 0.66,
        LEAD_FAILURE_PENALTY: 1.104,
        CONFLICT_PENALTY: -0.068,
        CLOSER_BONUS: 2.053
    }
};

// gate_benchmarks.json 데이터 (일부 핵심 거리/장소 추출)
export const GATE_BENCHMARKS = {
    SEOUL: {
        "1000": { "1": -0.175, "2": -0.157, "3": -0.173, "10": 0.048, "11": 0.113, "12": 0.1 },
        "1200": { "1": -0.245, "2": -0.153, "3": -0.1, "12": -0.033, "13": -0.014, "14": -0.011 },
        "1700": { "1": -0.313, "2": -0.182, "3": -0.275, "10": -0.067, "11": 0.035, "12": 0.096 }
    },
    BUSAN: {
        "1200": { "1": -0.03, "2": -0.133, "3": -0.075, "12": -0.075, "13": -0.021, "14": -0.086 },
        "1600": { "1": 0.337, "2": 0.125, "12": -0.504, "13": -0.106, "14": -0.414 }
    }
};

// human_factors.json에서 상위 랭커 데이터 추출 (샘플링)
export const HUMAN_FACTORS = {
    JOCKEY: {
        "문세영": -0.8152,
        "김혜선": -0.3558,
        "다실바": -0.5411,
        "서승운": -0.5852,
        "페로비치": -0.6012,
        "임기원": -0.3235,
        "이혁": -0.2967,
        "안토니오": -0.2392,
        "장추열": -0.3889
    },
    TRAINER: {
        "김영관": -0.5074,
        "리카디": -0.4921,
        "박대흥": -0.3966,
        "백광열": -0.3748
    }
};

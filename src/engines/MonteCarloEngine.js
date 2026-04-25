
/**
 * 고도화된 몬테카를로 시뮬레이션 엔진 (V8.0)
 * - Truncated Normal Distribution (절단 정규분포)
 * - Dynamic Sigma (Distance & Jockey synergy)
 * - Regression to Mean (신뢰도 기반 회귀)
 */

// ============ 수학적 보조 함수 ============

/**
 * 표준정규분포 누적분포함수 (CDF) Φ(x)
 */
function Phi(x) {
    const erf = (val) => {
        const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
        const sign = val >= 0 ? 1 : -1;
        val = Math.abs(val);
        const t = 1.0 / (1.0 + p * val);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-val * val);
        return sign * y;
    };
    return 0.5 * (1.0 + erf(x / Math.sqrt(2)));
}

/**
 * 표준정규분포 역누적분포함수 (Quantile) Φ^-1(p)
 */
function Phi_inv(p) {
    const t = Math.sqrt(-2.0 * Math.log(p < 0.5 ? p : 1.0 - p));
    const c = [2.515517, 0.802853, 0.010328], d = [1.432788, 0.189269, 0.001308];
    const val = t - ((c[2] * t + c[1]) * t + c[0]) / (((d[2] * t + d[1]) * t + d[0]) * t + 1.0);
    return p < 0.5 ? -val : val;
}

/**
 * 절단 정규분포 난수 생성
 */
function randomGaussianTruncated(mean, stdDev, min, max) {
    const alpha = (min - mean) / stdDev;
    const beta = (max - mean) / stdDev;
    const u = Math.random();
    const p = Phi(alpha) + u * (Phi(beta) - Phi(alpha));
    // p가 0이나 1에 너무 가까우면 NaN 발생 방지
    const z = Phi_inv(Math.max(0.0001, Math.min(0.9999, p)));
    return mean + z * stdDev;
}

// ============ 메인 시뮬레이터 클래스 ============

export class MonteCarloSimulator {
    constructor(iterations = 10000) {
        this.iterations = iterations;
        this.trackConditions = [
            { name: 'excellent', adjustment: -0.4, probability: 0.15 },
            { name: 'good', adjustment: -0.15, probability: 0.30 },
            { name: 'normal', adjustment: 0.0, probability: 0.40 },
            { name: 'soft', adjustment: +0.25, probability: 0.10 },
            { name: 'heavy', adjustment: +0.5, probability: 0.05 },
        ];
    }

    run(items) {
        if (!items || items.length === 0) return {};

        const wins = {};
        const leads = {};
        const top3 = {};
        const totalTimes = {};
        
        items.forEach(item => {
            wins[item.id] = 0;
            leads[item.id] = 0;
            top3[item.id] = 0;
            totalTimes[item.id] = 0;
        });

        // 1만 번의 고도화된 경주 시뮬레이션
        for (let i = 0; i < this.iterations; i++) {
            // 1. 공통 트랙 환경 결정 (Correlation)
            const rand = Math.random();
            let cumulative = 0;
            let trackEffect = 0;
            for (const cond of this.trackConditions) {
                cumulative += cond.probability;
                if (rand < cumulative) {
                    trackEffect = cond.adjustment;
                    break;
                }
            }

            let bestFinishTime = Infinity;
            let bestS1FTime = Infinity;
            let winnerId = null;
            let leaderId = null;
            let raceTimes = [];

            items.forEach(item => {
                // 2. 거리/기수 보정된 시그마 산출
                const distAdj = { 1000: 1.25, 1200: 1.2, 1400: 1.1, 1800: 1.0, 2000: 0.95 }[item.distance] || 1.0;
                const dynamicSigma = (item.stdDev * distAdj) * (item.jockeyFactor || 1.0);

                // 3. 절단 정규분포로 현실적 기록 생성 (Truncated)
                // 평균에서 +- 3시그마를 벗어나지 않도록 물리적 캡핑
                const minRange = item.meanTime - (dynamicSigma * 3.5);
                const maxRange = item.meanTime + (dynamicSigma * 3.5);
                
                const finishTime = randomGaussianTruncated(item.meanTime, dynamicSigma, minRange, maxRange) + trackEffect;
                const s1fTime = randomGaussianTruncated(item.s1fMean || (item.meanTime * 0.18), 0.15, 13.0, 15.5);

                totalTimes[item.id] += finishTime;
                raceTimes.push({ id: item.id, time: finishTime });

                // 우승/선행 판정
                if (finishTime < bestFinishTime) {
                    bestFinishTime = finishTime;
                    winnerId = item.id;
                }
                if (s1fTime < bestS1FTime) {
                    bestS1FTime = s1fTime;
                    leaderId = item.id;
                }
            });

            // 4. 우승 및 입상(Top 3) 기록
            if (winnerId !== null) wins[winnerId]++;
            if (leaderId !== null) leads[leaderId]++;
            
            // 입상자 판정 (시간 순 정렬)
            raceTimes.sort((a, b) => a.time - b.time);
            for (let j = 0; j < Math.min(3, raceTimes.length); j++) {
                top3[raceTimes[j].id]++;
            }
        }

        const results = {};
        items.forEach(item => {
            const rawWinProb = (wins[item.id] / this.iterations) * 100;
            const rawTop3Prob = (top3[item.id] / this.iterations) * 100;

            // 5. 회귀 효과 적용 (Regression to Mean)
            // 기록 횟수가 적을수록 평균(리그 중간값)으로 확률 수축
            const trustWeight = Math.min(0.8, 0.2 + (item.recordCount || 3) * 0.15);
            const leagueMeanWin = 100 / items.length;
            const adjustedWinProb = (rawWinProb * trustWeight) + (leagueMeanWin * (1 - trustWeight));

            results[item.id] = {
                id: item.id,
                winProbability: adjustedWinProb,
                top3Probability: rawTop3Prob,
                leadProbability: (leads[item.id] / this.iterations) * 100,
                simulatedMeanTime: totalTimes[item.id] / this.iterations,
                baseMeanTime: item.meanTime,
                stdDev: item.stdDev
            };
        });

        return results;
    }
}

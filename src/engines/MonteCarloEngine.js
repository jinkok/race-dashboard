/**
 * 몬테카를로 난수 시뮬레이터 
 * 가우시안 분포(정규 분포)를 기반으로 마필의 주행 기록 분산을 시뮬레이션
 */

// Box-Muller Transform을 사용한 가우시안 난수 생성 (평균 mean, 표준편차 stdDev)
export function randomGaussian(mean, stdDev) {
    let u1 = 0, u2 = 0;
    // 0이 나오면 극단값이 되므로 제외
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
}

export class MonteCarloSimulator {
    /**
     * @param {number} iterations - 시뮬레이션 반복 횟수 (기본 10000회)
     */
    constructor(iterations = 10000) {
        this.iterations = iterations;
    }

    /**
     * @param {Array} items - 마필 목록. 각 객체는 id, meanTime, stdDev가 필수. 
     *                        옵션으로 s1fMean, s1fSigma가 있으면 선행확률도 계산.
     * @returns {Object} 각 마필(id)별 진정한 우승 확률 및 선행 확률 데이터
     */
    run(items) {
        if (!items || items.length === 0) return {};

        const wins = {};
        const leads = {};
        const totalTimes = {};
        
        items.forEach(item => {
            wins[item.id] = 0;
            leads[item.id] = 0;
            totalTimes[item.id] = 0;
        });

        // 몬테카를로 루프 실행
        for (let i = 0; i < this.iterations; i++) {
            let bestFinishTime = Infinity;
            let winnerId = null;
            
            let bestS1FTime = Infinity;
            let leaderId = null;

            const globalNoise = randomGaussian(0, 0.15);

            items.forEach(item => {
                // 1. 선행 확률 계산 (S1F 지점)
                if (item.s1fMean) {
                    const s1fTime = randomGaussian(item.s1fMean, item.s1fSigma || 0.15) + (globalNoise * 0.5);
                    if (s1fTime < bestS1FTime) {
                        bestS1FTime = s1fTime;
                        leaderId = item.id;
                    }
                }

                // 2. 우승 확률 계산 (결승선 지점)
                const finishTime = randomGaussian(item.meanTime, item.stdDev) + globalNoise;
                totalTimes[item.id] += finishTime;
                
                if (finishTime < bestFinishTime) {
                    bestFinishTime = finishTime;
                    winnerId = item.id;
                }
            });

            if (winnerId !== null) wins[winnerId]++;
            if (leaderId !== null) leads[leaderId]++;
        }

        const results = {};
        items.forEach(item => {
            results[item.id] = {
                id: item.id,
                winProbability: (wins[item.id] / this.iterations) * 100,
                leadProbability: (leads[item.id] / this.iterations) * 100,
                simulatedMeanTime: totalTimes[item.id] / this.iterations,
                baseMeanTime: item.meanTime,
                stdDev: item.stdDev
            };
        });

        return results;
    }
}

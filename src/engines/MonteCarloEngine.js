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
     * @param {Array} items - 마필 목록. 각 객체는 반드시 id, meanTime, stdDev 속성이 있어야 함.
     * @returns {Object} 각 마필(id)별 진정한 우승 확률(winProbability) 및 통계 데이터
     */
    run(items) {
        if (!items || items.length === 0) return {};

        const wins = {};
        const totalTimes = {};
        
        items.forEach(item => {
            wins[item.id] = 0;
            totalTimes[item.id] = 0;
        });

        // 몬테카를로 루프 실행
        for (let i = 0; i < this.iterations; i++) {
            let bestTime = Infinity;
            let winnerId = null;
            
            // 글로벌 노이즈: 트랙 전반의 상태 당일 돌발 변수(페이스 붕괴, 날씨 급변 등) 모사
            // 평균 0초, 표준편차 0.3초의 공통 환경 변수
            const globalNoise = randomGaussian(0, 0.3);

            items.forEach(item => {
                // 마필 고유의 주행 기록 난수 + 글로벌 노이즈 반영
                const time = randomGaussian(item.meanTime, item.stdDev) + globalNoise;
                totalTimes[item.id] += time;
                
                // 시간 경마이므로 가장 짧은 시간이 우승
                if (time < bestTime) {
                    bestTime = time;
                    winnerId = item.id;
                }
            });

            if (winnerId !== null) {
                wins[winnerId]++;
            }
        }

        const results = {};
        items.forEach(item => {
            results[item.id] = {
                id: item.id,
                winProbability: (wins[item.id] / this.iterations) * 100, // 백분율
                simulatedMeanTime: totalTimes[item.id] / this.iterations,
                baseMeanTime: item.meanTime,
                stdDev: item.stdDev
            };
        });

        return results;
    }
}

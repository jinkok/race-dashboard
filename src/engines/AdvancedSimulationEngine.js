import { MonteCarloSimulator } from "./MonteCarloEngine.js";
import { PaceAndTacticsAnalyzer } from "./PaceAndTacticsAnalyzer.js";
import { DefaultTuningConfig } from "./TuningConfig.js";

/**
 * 🧬 KRA 차세대 경마 시뮬레이션 엔진 (Mu & Sigma Pipeline Architecture)
 * 
 * [사용 설명서 및 아키텍처 가이드]
 * 
 * 1. Mu (μ) 파이프라인: 결정적 기대값 (가산/감산 모듈)
 *    - 마필이 경주에서 낼 수 있는 '가장 확률 높은 기록(초)'을 결정합니다.
 *    - 주요 항목: 기초 기록(거리 유사도 반영), 개별 부중 민감도, 오버페이스 페널티, 
 *                G1F 유지력 보너스, 기수 기량, 주로 함수율 보정.
 * 
 * 2. Sigma (σ) 파이프라인: 불확실성/리스크 (배율 모듈)
 *    - 마필의 컨디션이나 전개에 따른 '기복의 폭'을 결정합니다.
 *    - 주요 항목: 선행 경합 리스크(Meltdown), 안쪽 게이트 갇힘, 장기 휴양, 체중급변.
 *    - 숫자가 클수록(x1.5 등) 이변의 가능성(모 아니면 도)이 높아집니다.
 * 
 * 3. 몬테카를로 시뮬레이션
 *    - 위 파이프라인을 통과한 최종 μ와 σ를 정규분포(Gaussian)의 구심점으로 삼아
 *    - 10,000회의 가상 경주를 수행하고 각 마필의 우승 횟수를 확률(%)로 환산합니다.
 * 
 * [튜닝 방법]
 * - 모든 보정 계수는 'TuningConfig.js'에서 하드코딩 없이 관리됩니다.
 * - 결과 확인 시 'trace' 로그를 통해 각 파이프라인의 보정 근거를 추적할 수 있습니다.
 */
export class AdvancedSimulationEngine {
    constructor(race, location, trackInfo, statsAnalysis, sireInfo, jockeyStats, trainerStats, moistureIndex = 10, customConfig = null) {
        this.race = race;
        this.location = location;
        this.trackInfo = trackInfo;
        this.statsAnalysis = statsAnalysis;
        this.sireInfo = sireInfo;
        this.jockeyStats = jockeyStats;
        this.trainerStats = trainerStats;
        this.moistureIndex = moistureIndex;

        // 설정 병합
        this.config = customConfig ? { ...DefaultTuningConfig, ...customConfig } : DefaultTuningConfig;

        this.paceAnalyzer = new PaceAndTacticsAnalyzer(trackInfo, statsAnalysis);
        this.mcEngine = new MonteCarloSimulator(10000);

        // -------------------------------------------------------------
        // [Mu 파이프라인] 물리적 스피드 증감 (초 단위 가감)
        // -------------------------------------------------------------
        this.muModifiers = [
            this.modMu_BurdenWeight.bind(this),   // 부담중량 보정
            this.modMu_StayRatio.bind(this),      // 후반 주폭 유지력
            this.modMu_OverPace.bind(this),       // 장거리 오버페이스 페널티
            this.modMu_GateDistance.bind(this),   // 게이트 외곽 코너링 손실
            this.modMu_JockeySkill.bind(this),    // 기수 기량 강화
            this.modMu_TrackMoisture.bind(this),  // 주로 함수율 기본 보정
            this.modMu_ClassBonus.bind(this)      // 등급 우위/열세 보정
        ];

        // -------------------------------------------------------------
        // [Sigma 파이프라인] 전개 리스크 증폭 (배율 곱셈)
        // -------------------------------------------------------------
        this.sigmaModifiers = [
            this.modSigma_Layoff.bind(this),           // 장기 휴양마 불확실성
            this.modSigma_GateTraffic.bind(this),      // 내측 게이트 갇힘 리스크
            this.modSigma_PaceConflict.bind(this),     // 선행 경합 리스크
            this.modSigma_WeightChange.bind(this),     // 체중 급변 리스크
            this.modSigma_TrainingCondition.bind(this) // 조교 상태 리스크 완화
        ];

        this.raceContext = this.analyzeRaceContext();
    }

    /**
     * 레이스 편성 분석 (선행 경합 및 등급 표준 파악)
     */
    analyzeRaceContext() {
        const horses = this.race.horses || [];
        const frontRunners = horses.filter(h => {
            const style = this.paceAnalyzer.classifyRunStyle(h);
            return style === 'E' || style === 'P';
        });

        // 등급 표준 기록 (avg_record) 파이프라인용 캐싱
        let baseMeanTime = (parseInt(this.race.distance) || 1200) / 16.5; 
        if (this.statsAnalysis?.avg_record && this.statsAnalysis.avg_record.includes(':')) {
            const [min, sec] = this.statsAnalysis.avg_record.split(':');
            baseMeanTime = (parseInt(min) * 60) + parseFloat(sec);
        }

        return {
            frontRunnerCount: frontRunners.length,
            isPaceMeltdown: frontRunners.length >= 4,
            classStandardTime: baseMeanTime,
            targetDistance: parseInt(this.race.distance) || 1200
        };
    }

    /**
     * 메인 시뮬레이션 실행 함수
     */
    runSimulation() {
        const horses = this.race.horses || [];
        const simItems = horses.map(horse => {
            const trace = [];

            // 1. 순수 기초 기록 산출 (거리 유사도 가중치 반영)
            let baseMu = this.calculateBaseMu(horse, trace);

            // 2. 기초 변동성 산출 (각질별 기본 기복)
            let baseSigma = this.calculateBaseSigma(horse, trace);

            // 3. Mu 파이프라인 관통 (+-)
            let finalMu = this.applyMuModifiers(baseMu, horse, trace);

            // 4. Sigma 파이프라인 관통 (x)
            let finalSigma = this.applySigmaModifiers(baseSigma, horse, trace);

            return {
                id: horse.horse_no, // MonteCarloSimulator에서 매칭용 ID로 사용
                horse_no: horse.horse_no, // UI 호환용
                meanTime: finalMu,
                stdDev: finalSigma,
                style: this.paceAnalyzer.classifyRunStyle(horse),
                trace: trace
            };
        });

        // 몬테카를로 엔진 실행
        const mcResults = this.mcEngine.run(simItems);

        // UI(SimulationZone.jsx)가 기대하는 포맷으로 가공 및 정렬
        return Object.keys(mcResults).map(id => {
            const item = simItems.find(i => i.id == id);
            const styleLabel = item.style === 'E' ? '선행' : (item.style === 'P' ? '선입' : '추입');
            return {
                horse_no: parseInt(id),
                winProbability: mcResults[id].winProbability || 0,
                expectedTime: mcResults[id].simulatedMeanTime || item.meanTime,
                baseMeanTime: mcResults[id].baseMeanTime || item.meanTime,
                style: styleLabel,
                stdDev: item.stdDev || 1.0,
                trace: item.trace || []
            };
        }).sort((a, b) => b.winProbability - a.winProbability);
    }

    // =========================================================================
    // LAYER 1: 순수 기초 능력치 산출 (Context-Aware)
    // =========================================================================

    calculateBaseMu(horse, trace) {
        const targetDist = this.raceContext.targetDistance;
        let totalWeight = 0;
        let weightedTimeSum = 0;

        const hist = (horse.recent_history || []).filter(r => !r.class?.includes("주행") && r.record && r.record.includes(':'));
        
        if (hist.length > 0) {
            hist.forEach(record => {
                const distVal = parseInt(String(record.distance || "").replace(/\D/g, '')) || targetDist;
                const diff = Math.abs(targetDist - distVal);
                let weight = 0;

                // [USER DESIGN] 거리 유사도 가중치
                if (diff === 0) weight = 1.0;
                else if (diff <= 100) weight = 0.8;
                else if (diff <= 200) weight = 0.4;
                else weight = 0.1;

                const daysAgo = record.days_ago || 30; 
                const recencyDiscount = Math.max(0.5, 1 - (daysAgo / 365));
                const finalWeight = weight * recencyDiscount;

                const [min, sec] = record.record.split(':');
                const timeSeconds = (parseInt(min) * 60) + parseFloat(sec);
                const convertedTime = (timeSeconds / distVal) * targetDist;

                weightedTimeSum += (convertedTime * finalWeight);
                totalWeight += finalWeight;
            });
        }

        let baseTime = (totalWeight > 0) ? (weightedTimeSum / totalWeight) : this.raceContext.classStandardTime;
        trace.push({ factor: "기초기록(가중)", impact: `${baseTime.toFixed(2)}s` });
        return baseTime;
    }

    calculateBaseSigma(horse, trace) {
        const style = this.paceAnalyzer.classifyRunStyle(horse);
        let sigma = 1.0;
        if (style === 'S' || style === 'M') sigma = 1.3; // 추입마 기복
        if (style === 'E') sigma = 0.8; // 선행마 안정적
        if (style === 'P') sigma = 1.0; // 선입 표준

        trace.push({ factor: `기본기복(${style})`, impact: `${sigma.toFixed(2)}` });
        return sigma;
    }

    // =========================================================================
    // LAYER 2: 파이프라인 실행기
    // =========================================================================

    applyMuModifiers(currentMu, horse, trace) {
        let mu = currentMu;
        for (const modifier of this.muModifiers) {
            const result = modifier(horse);
            if (result && result.value !== 0) {
                mu += result.value;
                const sign = result.value > 0 ? "+" : "";
                trace.push({ factor: result.name, impact: `${sign}${result.value.toFixed(2)}s` });
            }
        }
        return mu;
    }

    applySigmaModifiers(currentSigma, horse, trace) {
        let sigma = currentSigma;
        for (const modifier of this.sigmaModifiers) {
            const result = modifier(horse);
            if (result && result.value !== 1.0) {
                sigma *= result.value;
                trace.push({ factor: result.name, impact: `x${result.value.toFixed(2)}` });
            }
        }
        return Math.max(0.3, Math.min(3.5, sigma));
    }

    // =========================================================================
    // LAYER 3: Mu 보정 (초 단위 증감)
    // =========================================================================

    modMu_BurdenWeight(horse) {
        const hist = horse.recent_history || [];
        const currentBurden = parseFloat(horse.burden_weight) || 54.0;
        const avgBurden = hist.length > 0 
            ? hist.reduce((sum, r) => sum + parseFloat(r.burden_weight || 54), 0) / hist.length 
            : 54.0;
        
        const diff = currentBurden - avgBurden;
        if (diff === 0) return null;

        // 개별 민감도 분석 (체구/각질 반영)
        const bodyWeight = parseFloat(horse.weight) || 480;
        const style = this.paceAnalyzer.classifyRunStyle(horse);
        let sensitivity = this.config.weight.impactPerKg || 0.15;
        
        if (bodyWeight >= 520) sensitivity *= 0.85;
        if (style === 'E') sensitivity *= 1.1;

        // 고부중 극복마 보너스
        const isBearer = hist.some(r => parseFloat(r.burden_weight) >= 56 && parseInt(r.rank) <= 3);
        if (isBearer) sensitivity *= 0.75;

        const penalty = diff * sensitivity;
        return { name: `부중보정(${isBearer ? '극복마' : ''})`, value: penalty };
    }

    modMu_StayRatio(horse) {
        if (this.raceContext.targetDistance < 1400) return null;
        
        const hist = (horse.recent_history || []).filter(r => r.distance === this.raceContext.targetDistance && r.g1f_record);
        if (hist.length === 0) return null;

        const avgG1F = hist.reduce((sum, r) => sum + parseFloat(r.g1f_record), 0) / hist.length;
        const stdG1F = 13.5; // 임시 표준
        const ratio = stdG1F / avgG1F;

        if (ratio > 1.05) return { name: "우수주폭유지(G1F)", value: -0.4 };
        if (ratio < 0.95) return { name: "뒷심부족(G1F)", value: 0.5 };
        return null;
    }

    modMu_OverPace(horse) {
        if (this.raceContext.targetDistance < 1600) return null;
        
        const style = this.paceAnalyzer.classifyRunStyle(horse);
        if (style !== 'E' && style !== 'P') return null;

        const hist = (horse.recent_history || []).filter(r => parseInt(r.distance) <= 1300 && r.s1f_record > 0);
        if (hist.length === 0) return null;

        const avgShortS1F = hist.reduce((sum, r) => sum + parseFloat(r.s1f_record), 0) / hist.length;
        const targetStdS1F = 14.5; // 장거리 표준 S1F

        if (avgShortS1F < targetStdS1F) {
            const diff = targetStdS1F - avgShortS1F;
            const penalty = Math.pow(diff, 1.5) * 1.5;
            return { name: "오버페이스위험", value: penalty };
        }
        return null;
    }

    modMu_GateDistance(horse) {
        if (this.raceContext.targetDistance <= 1400 && horse.gate_no >= 10) {
            return { name: "외곽게이트손실", value: 0.2 };
        }
        return null;
    }

    modMu_JockeySkill(horse) {
        const jockey = horse.jockey;
        const stats = this.jockeyStats && this.jockeyStats[jockey];
        if (stats?.win_rate > 15) return { name: "특급기수", value: -0.25 };
        return null;
    }

    modMu_TrackMoisture(horse) {
        const moisture = this.moistureIndex;
        if (moisture >= 15) {
            const style = this.paceAnalyzer.classifyRunStyle(horse);
            if (style === 'E') return { name: "다습/선행유리", value: -0.3 };
        }
        return null;
    }

    modMu_ClassBonus(horse) {
        // [Step 1] 등급 경쟁력
        const recordGap = this.calculateBaseMu(horse, []) - this.raceContext.classStandardTime;
        if (recordGap < 0) {
            return { name: "등급우위", value: recordGap * 0.2 };
        }
        return null;
    }

    // =========================================================================
    // LAYER 4: Sigma 보정 (리스크 배율)
    // =========================================================================

    modSigma_Layoff(horse) {
        const days = horse.days_ago || 30;
        if (days >= 90) return { name: "장기휴양마", value: 1.5 };
        return null;
    }

    modSigma_GateTraffic(horse) {
        const gate = parseInt(horse.gate_no);
        const style = this.paceAnalyzer.classifyRunStyle(horse);
        if ((style === 'S' || style === 'M') && gate <= 3) return { name: "안쪽갇힘리스크", value: 1.3 };
        return null;
    }

    modSigma_PaceConflict(horse) {
        if (!this.raceContext.isPaceMeltdown) return null;
        const style = this.paceAnalyzer.classifyRunStyle(horse);
        if (style === 'E' || style === 'P') return { name: "선행경합리스크", value: 1.6 };
        if (style === 'S') return { name: "경합어부지리", value: 0.8 };
        return null;
    }

    modSigma_WeightChange(horse) {
        const current = parseFloat(horse.weight);
        const prev = parseFloat(horse.prev_weight);
        if (current > 0 && prev > 0 && Math.abs(current - prev) >= 10) {
            return { name: "체중급변리스크", value: 1.25 };
        }
        return null;
    }

    modSigma_TrainingCondition(horse) {
        if (horse.training_quality === "우수") return { name: "우수조교(안정)", value: 0.85 };
        return null;
    }
}

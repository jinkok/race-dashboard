import { EMPIRICAL_CONFIG, GATE_BENCHMARKS, HUMAN_FACTORS } from "./EmpiricalData.js";
import { MonteCarloSimulator } from "./MonteCarloEngine.js";
import { PaceAndTacticsAnalyzer } from "./PaceAndTacticsAnalyzer.js";
import { DefaultTuningConfig } from "./TuningConfig.js";

/**
 * 🧬 KRA 차세대 경마 시뮬레이션 엔진 (Mu & Sigma Pipeline Architecture)
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

        this.config = customConfig ? { ...DefaultTuningConfig, ...customConfig } : DefaultTuningConfig;
        this.paceAnalyzer = new PaceAndTacticsAnalyzer(trackInfo, statsAnalysis);
        this.mcEngine = new MonteCarloSimulator(10000);
        this.raceContext = this.analyzeRaceContext();
    }

    extractAvgSpeed(horse, type) {
        // type: 's1f' or 'g1f'
        const timeKey = type === 's1f' ? 'early_speed' : 'closing_speed';
        
        // 1순위: 메타 데이터의 실제 시간(초) 필드
        const direct = horse[timeKey] || (horse.meta && horse.meta[timeKey]) || horse[type + "_time"] || (horse.meta && horse.meta["avg_" + type + "_time"]);
        if (direct) return parseFloat(direct);

        // 2순위: recent_history에서 동적 평균화
        const hist = horse.recent_history || [];
        const validRecords = hist.filter(r => r[type] && parseFloat(r[type]) > 10.0); // 10초 이상인 정상 기록만
        if (validRecords.length > 0) {
            const sum = validRecords.reduce((acc, r) => acc + parseFloat(r[type]), 0);
            return sum / validRecords.length;
        }
        return type === 's1f' ? 14.5 : 13.5;
    }

    extractAvgSpeed(horse, type) {
        // type: 's1f' or 'g1f'
        const timeKey = type === 's1f' ? 'early_speed' : 'closing_speed';
        
        // 1순위: 메타 데이터의 실제 시간(초) 필드
        const direct = horse[timeKey] || (horse.meta && horse.meta[timeKey]) || horse[type + "_time"] || (horse.meta && horse.meta["avg_" + type + "_time"]);
        if (direct) return parseFloat(direct);

        // 2순위: recent_history에서 동적 평균화
        const hist = horse.recent_history || [];
        const validRecords = hist.filter(r => r[type] && parseFloat(r[type]) > 10.0); // 10초 이상인 정상 기록만
        if (validRecords.length > 0) {
            const sum = validRecords.reduce((acc, r) => acc + parseFloat(r[type]), 0);
            return sum / validRecords.length;
        }
        return type === 's1f' ? 14.5 : 13.5;
    }

    analyzeRaceContext() {
        const horses = this.race.horses || [];
        const frontRunners = horses.filter(h => {
            const style = this.paceAnalyzer.classifyRunStyle(h);
            return style === 'E' || style === 'P';
        });

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

    runSimulation() {
        const horses = this.race.horses || [];
        const simItems = horses.map(horse => {
            const trace = [];
            let baseMu = this.calculateBaseMu(horse, trace);
            let baseSigma = this.calculateBaseSigma(horse, trace);
            let finalMu = this.applyMuModifiers(baseMu, horse, trace);
            let finalSigma = this.applySigmaModifiers(baseSigma, horse, trace);

            return {
                id: horse.horse_no,
                horse_no: horse.horse_no,
                meanTime: finalMu,
                stdDev: finalSigma,
                s1fMean: this.extractAvgSpeed(horse, 's1f'),
                s1fSigma: 0.15, // S1F 변동폭은 결승선보다 좁음
                style: this.paceAnalyzer.classifyRunStyle(horse),
                trace: trace
            };
        });

        const mcResults = this.mcEngine.run(simItems);

        return Object.keys(mcResults).map(id => {
            const item = simItems.find(i => i.id == id);
            const styleLabel = item.style === 'E' ? '선행' : (item.style === 'P' ? '선입' : '추입');
            return {
                horse_no: parseInt(id),
                win_prob: mcResults[id].winProbability || 0,
                winProbability: mcResults[id].winProbability || 0,
                expectedTime: mcResults[id].simulatedMeanTime || item.meanTime,
                mu: mcResults[id].simulatedMeanTime || item.meanTime,
                style: styleLabel,
                sigma: item.stdDev,
                sim_stats: {
                    leads: mcResults[id].leadProbability || 0,
                    top3: (mcResults[id].winProbability || 0) * 2.2 // 입상은 우승의 약 2.2배 가중
                },
                trace: item.trace
            };
        }).sort((a, b) => b.win_prob - a.win_prob);
    }

    calculateBaseMu(horse, trace) {
        const targetDist = this.raceContext.targetDistance;
        let weightedTimeSum = 0;
        let totalWeight = 0;
        const hist = horse.recent_history || [];
        
        if (hist.length > 0) {
            hist.forEach(record => {
                const distVal = parseInt(String(record.distance || "").replace(/\D/g, '')) || targetDist;
                const diff = Math.abs(targetDist - distVal);
                let weight = (diff === 0) ? 1.0 : (diff <= 100 ? 0.8 : (diff <= 200 ? 0.4 : 0.1));
                const daysAgo = record.days_ago || 30; 
                const recencyDiscount = Math.max(0.5, 1 - (daysAgo / 365));
                const finalWeight = weight * recencyDiscount;

                if (record.record && record.record.includes(':')) {
                    const [min, sec] = record.record.split(':');
                    const timeSeconds = (parseInt(min) * 60) + parseFloat(sec);
                    const convertedTime = (timeSeconds / distVal) * targetDist;
                    weightedTimeSum += (convertedTime * finalWeight);
                    totalWeight += finalWeight;
                }
            });
        }

        let baseTime = (totalWeight > 0) ? (weightedTimeSum / totalWeight) : this.raceContext.classStandardTime;
        trace.push({ factor: "기초기록(가중)", impact: `${baseTime.toFixed(2)}s` });
        return baseTime;
    }

    calculateBaseSigma(horse, trace) {
        const style = this.paceAnalyzer.classifyRunStyle(horse);
        let sigma = (style === 'S' || style === 'M') ? 1.3 : (style === 'E' ? 0.8 : 1.0);
        trace.push({ factor: `기본기복(${style})`, impact: `${sigma.toFixed(2)}` });
        return sigma;
    }

    applyMuModifiers(baseMu, horse, trace) {
        let finalMu = baseMu;
        const mods = [
            this.modMu_TrackMoisture.bind(this),
            this.modMu_JockeySkill.bind(this),
            this.modMu_TrainerSkill.bind(this),
            this.modMu_GateDistance.bind(this),
            this.modMu_ParticipationPeriod.bind(this),
            this.modMu_FirstDistanceExperience.bind(this),
            this.modMu_GradePromotionImpact.bind(this),
            this.modMu_MedicalPenalty.bind(this),
            this.modMu_WeightImpact.bind(this),
            this.modMu_OverPace.bind(this),
            this.modMu_PaceImpact.bind(this)
        ];

        for (const mod of mods) {
            const result = mod(horse);
            if (result && result.value !== 0) {
                finalMu += result.value;
                const sign = result.value > 0 ? "+" : "";
                trace.push({ factor: result.name, impact: sign + result.value.toFixed(2) + "s" });
            }
        }
        return finalMu;
    }

    applySigmaModifiers(baseSigma, horse, trace) {
        let sigma = baseSigma;
        const mods = [
            this.modSigma_PaceConflict.bind(this),
            this.modSigma_WeightChange.bind(this),
            this.modSigma_SynergyAndTraining.bind(this),
            this.modSigma_ParticipationRisk.bind(this),
            this.modSigma_MedicalRisk.bind(this)
        ];

        for (const mod of mods) {
            const result = mod(horse);
            if (result && result.value !== 1.0) {
                sigma *= result.value;
                trace.push({ factor: result.name, impact: `x${result.value.toFixed(2)}` });
            }
        }
        return Math.max(0.3, Math.min(3.5, sigma));
    }

    modMu_TrackMoisture() {
        const moisture = this.moistureIndex || 10;
        const locKey = (this.location || 'SEOUL').toUpperCase();
        const config = EMPIRICAL_CONFIG.LOCATION[locKey] || EMPIRICAL_CONFIG.LOCATION.SEOUL;
        const impact = (moisture - EMPIRICAL_CONFIG.COMMON.STANDARD_MOISTURE) * config.MOISTURE_IMPACT_PER_PCT;
        return { name: `함수율보정(${moisture}%)`, value: impact };
    }

    modMu_JockeySkill(horse) {
        const rawJockey = (horse.jockey || "").trim();
        const jockey = rawJockey.replace(/[\(\[].*?[\)\]]/g, '').trim();
        let skill = HUMAN_FACTORS.JOCKEY[jockey] || 0;
        let reasons = skill !== 0 ? ["숙련도"] : [];

        if (horse.jockey_stats && horse.jockey_stats.recent_stats) {
            const recentWinRate = parseFloat(horse.jockey_stats.recent_stats.win_rate || 0);
            const careerWinRate = horse.jockey_stats.career ? parseFloat(horse.jockey_stats.career.win_rate || 0) : 0;
            
            if (recentWinRate >= 15.0) {
                skill -= 0.15; // 15% 이상 우수 기수
                reasons.push(`우수폼(${recentWinRate}%)`);
            } else if (recentWinRate > 0 && recentWinRate <= 5.0) {
                skill += 0.15; // 5% 이하 부진
                reasons.push(`부진폼`);
            }

            if (careerWinRate > 0 && (recentWinRate - careerWinRate) >= 5.0) {
                skill -= 0.1; // 통산보다 최근이 훨씬 좋음 (상승세)
                reasons.push(`상승세`);
            }
        }

        return skill !== 0 ? { name: `기수보정(${jockey}/${reasons.join(',')})`, value: skill } : null;
    }

    modMu_TrainerSkill(horse) {
        const rawTrainer = (horse.trainer || "").trim();
        const trainer = rawTrainer.replace(/[\(\[].*?[\)\]]/g, '').trim();
        let skill = HUMAN_FACTORS.TRAINER[trainer] || 0;
        let reasons = skill !== 0 ? ["숙련도"] : [];

        if (horse.trainer_stats && horse.trainer_stats.recent_stats) {
            const recentWinRate = parseFloat(horse.trainer_stats.recent_stats.win_rate || 0);
            const careerWinRate = horse.trainer_stats.career ? parseFloat(horse.trainer_stats.career.win_rate || 0) : 0;
            
            if (recentWinRate >= 15.0) {
                skill -= 0.1;
                reasons.push(`우수조교(${recentWinRate}%)`);
            } else if (recentWinRate > 0 && recentWinRate <= 5.0) {
                skill += 0.1;
            }

            if (careerWinRate > 0 && (recentWinRate - careerWinRate) >= 5.0) {
                skill -= 0.05;
                reasons.push(`상승세`);
            }
        }

        return skill !== 0 ? { name: `조교사보정(${trainer}/${reasons.join(',')})`, value: skill } : null;
    }

    modMu_GateDistance(horse) {
        const gate = String(horse.gate_no || horse.horse_no || 1);
        const dist = String(this.raceContext.targetDistance);
        const locKey = (this.location || 'SEOUL').toUpperCase();
        const gateData = GATE_BENCHMARKS[locKey] && GATE_BENCHMARKS[locKey][dist];
        const offset = gateData ? gateData[gate] : null;
        return offset ? { name: `게이트보정(${gate}번)`, value: offset } : null;
    }

    modMu_PaceImpact(horse) {
        const style = this.paceAnalyzer.classifyRunStyle(horse);
        const moisture = this.moistureIndex || 10;
        const horses = this.race.horses || [];
        
        const frontRunners = horses.map(h => ({
            no: h.horse_no,
            s1f: this.extractAvgSpeed(h, 's1f'),
            style: this.paceAnalyzer.classifyRunStyle(h)
        })).filter(h => h.style === 'E' || h.style === 'P')
           .sort((a, b) => a.s1f - b.s1f);

        const frCount = frontRunners.length;
        if (frCount === 0) return null;

        const myS1F = this.extractAvgSpeed(horse, 's1f');
        const fastestS1F = frontRunners[0].s1f;
        const s1fDiff = myS1F - fastestS1F;

        if (frCount === 1 || (horse.horse_no === frontRunners[0].no && (frontRunners[1]?.s1f - fastestS1F) >= 0.3)) {
            if (style === 'E' || style === 'P') {
                const bonus = moisture >= 15 ? -0.7 : -0.35;
                return { name: `능력위주단독선행(${moisture >= 15 ? '가속주로' : '표준'})`, value: bonus };
            }
        }

        if (frCount >= 3 && s1fDiff <= 0.15) {
            if (style === 'E' || style === 'P') {
                const penalty = moisture <= 6 ? 0.6 : 0.35;
                return { name: `진짜경합페널티(${moisture <= 6 ? '무거운주로' : '표준'})`, value: penalty };
            }
        }

        if (frCount >= 3 && (frontRunners[2].s1f - fastestS1F) <= 0.2) {
             if ((style === 'S' || style === 'M') && moisture <= 6) {
                return { name: "전개붕괴반사이익", value: -0.45 };
            }
        }
        return null;
    }

    modMu_ParticipationPeriod(horse) {
        const periodStr = horse.participation_period || "";
        const weeks = parseInt(periodStr.replace(/[^0-9]/g, '')) || 4; 
        
        if (weeks >= 15) {
            return { name: `장기휴양(${weeks}주)`, value: 0.1 }; 
        } else if (weeks <= 2) {
            return { name: `혹사주의(${weeks}주)`, value: 0.85 }; // 실측치 반영 (+0.88s)
        } else if (weeks === 3) {
            return { name: `짧은주기(3주)`, value: 0.35 }; // 실측치 반영 (+0.39s)
        } else if (weeks >= 4 && weeks <= 9) {
            return { name: `최적주기`, value: -0.15 }; // 실측치 반영 (-0.1~0.2s)
        }
        return null;
    }

    modMu_FirstDistanceExperience(horse) {
        if (!horse.recent_history || horse.recent_history.length === 0) return null;
        
        const currentDist = parseInt(this.race.race_info?.distance || 0);
        const pastDistances = horse.recent_history.map(h => parseInt(h.distance.replace(/[^0-9]/g, '') || 0));
        const seenDistances = new Set(pastDistances);
        const maxPastDist = Math.max(...pastDistances);

        if (!seenDistances.has(currentDist)) {
            if (currentDist > maxPastDist) {
                // 실측치 반영: 첫 거리 연장 경험 (+0.47s)
                return { name: "첫거리도전(거리연장)", value: 0.45 };
            } else {
                // 실측치 반영: 거리 단축 경험 (오히려 기록 개선 경향 있으나 중립 처리)
                return { name: "첫거리경험(거리단축)", value: -0.1 };
            }
        }
        return null;
    }

    modMu_GradePromotionImpact(horse) {
        if (!horse.recent_history || horse.recent_history.length < 2) return null;

        const lastRace = horse.recent_history[0];
        const prevRaces = horse.recent_history.slice(1, 4);
        
        // 승군 여부 체크 (현재 등급이 이전 등급보다 높은 경우)
        // JSON 데이터에 'race_grade' 혹은 'class' 필드가 있을 것으로 가정
        const lastGradeStr = lastRace.class || lastRace.race_grade || "";
        const prevGrades = prevRaces.map(r => r.class || r.race_grade || "");
        
        // 등급 숫자가 낮아지는지 확인 (국5등급 -> 국4등급 등)
        const getGradeNum = (s) => {
            const m = s.match(/([0-9])등급/);
            return m ? parseInt(m[1]) : 9;
        };

        const lastGradeNum = getGradeNum(lastGradeStr);
        const minPrevGradeNum = Math.min(...prevGrades.map(getGradeNum));

        // 승군 첫 경기(혹은 최근 경기)에서 고전했으나, 이전 등급에서 우승/준우승 경력이 있는 경우
        if (lastGradeNum < minPrevGradeNum && parseInt(lastRace.result_rank || 10) >= 7) {
            const hadGreatPast = prevRaces.some(r => parseInt(r.result_rank || 10) <= 2);
            if (hadGreatPast) {
                // 승군 적응기 저평가 보정: 지난 경기의 부진을 70% 정도 상쇄
                return { name: "승군적응력(복구)", value: -0.65 }; // 초 단축 (보너스)
            }
        }
        return null;
    }

    modMu_MedicalPenalty(horse) {
        const alerts = horse.medical_alerts || [];
        const notes = horse.special_note || "";
        
        const hasLungIssue = alerts.some(a => a.detail?.includes("폐출혈")) || notes.includes("폐출혈");
        if (hasLungIssue) {
            return { name: "진료이력(폐출혈)", value: 0.35 }; // 호흡기 질환 패널티
        }
        return null;
    }

    modMu_WeightImpact(horse) { return null; }
    modMu_OverPace(horse) { return null; }

    modSigma_PaceConflict(horse) {
        if (this.raceContext.isPaceMeltdown && (this.paceAnalyzer.classifyRunStyle(horse) === 'E')) {
            return { name: "선행경합리스크", value: 1.3 };
        }
        return null;
    }
    
    modSigma_WeightChange(horse) { return null; }

    modSigma_SynergyAndTraining(horse) {
        let sigmaMod = 1.0;
        let reasons = [];

        // 1. 기수 교체 리스크 파악
        const currentJockey = (horse.jockey || "").replace(/[\(\[].*?[\)\]]/g, '').trim();
        if (horse.recent_history && horse.recent_history.length > 0) {
            const lastJockey = (horse.recent_history[0].jockey || "").replace(/[\(\[].*?[\)\]]/g, '').trim();
            if (currentJockey && lastJockey && currentJockey !== lastJockey) {
                sigmaMod *= 1.15; // 기복(리스크) 15% 증가
                reasons.push("기수교체");
            }
        }

        // 2. 기승기수 직접 조교 횟수 (시너지)
        const jTrainingCnt = parseInt(horse.jockey_training_cnt || 0);
        if (jTrainingCnt >= 2) {
            sigmaMod *= 0.85; // 기복 15% 감소 (매우 안정적)
            reasons.push("직접조교우수");
        } else if (jTrainingCnt === 1) {
            sigmaMod *= 0.95;
        }

        // 3. 강도 높은 훈련 (습보) 횟수
        const subboCnt = parseInt(horse.total_subbo_cnt || 0);
        if (subboCnt >= 4) {
            sigmaMod *= 0.90; // 기복 10% 감소 (승부의지)
            reasons.push("강조교(습보)");
        } else if (subboCnt === 0) {
            sigmaMod *= 1.05; // 기복 5% 증가 (의지 부족)
        }

        if (sigmaMod !== 1.0) {
            const name = reasons.length > 0 ? `조교/기수시너지(${reasons.join(',')})` : "조교/기수시너지";
            return { name: name, value: sigmaMod };
        }
        return null;
    }

    modSigma_ParticipationRisk(horse) {
        const periodStr = horse.participation_period || "";
        const weeks = parseInt(periodStr.replace(/[^0-9]/g, '')) || 4;

        if (weeks >= 15) {
            return { name: "장기휴양(기복)", value: 1.35 }; // 데이터상 StdDev 높음
        } else if (weeks >= 10) {
            return { name: "공백기(기복)", value: 1.2 };
        } else if (weeks <= 3) {
            return { name: "연투혹사(기복)", value: 1.15 };
        }
        return null;
    }

    modSigma_MedicalRisk(horse) {
        const alerts = horse.medical_alerts || [];
        const hasLungIssue = alerts.some(a => a.detail?.includes("폐출혈"));
        if (hasLungIssue) {
            return { name: "폐출혈이력(리스크)", value: 1.3 }; // 재발 가능성 및 급격한 침조 위험
        }
        return null;
    }
}

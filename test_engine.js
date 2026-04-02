import fs from 'fs';
import { AdvancedSimulationEngine } from './src/engines/AdvancedSimulationEngine.js';

// Load Data
const raceTrackInfo = JSON.parse(fs.readFileSync('./race_track_info.json', 'utf8'));
const trainerStats = JSON.parse(fs.readFileSync('./trainer_stats_260405.json', 'utf8'));
const jockeyStats = JSON.parse(fs.readFileSync('./jockey_stats_260405 copy.json', 'utf8'));
const mergedRaceData = JSON.parse(fs.readFileSync('./Merged_Race_Data_20260405.json', 'utf8'));

// Extract a sample race from Merged_Race_Data
// 구조: locations -> seoul -> races (배열)
const seoulRaces = mergedRaceData.locations.seoul.races;
const sampleRace = seoulRaces[0]; // 첫 번째 경주 선택

console.log("=== 테스트 대상 경주 ===");
if (sampleRace.race_info) {
    console.log(`경주명: ${sampleRace.race_info.course_name} (${sampleRace.race_info.distance})`);
} else {
    console.log(`경주 번호: ${sampleRace.race_no}`);
}

const location = 'seoul';
const statsAnalysis = sampleRace.stats_analysis;
const moistureIndexInput = process.argv[2] || 10; // 인자로 함수율 입력 (기본값 10)

console.log(`입력된 함수율(Moisture): ${moistureIndexInput}%`);

// Engine Initialization
const engine = new AdvancedSimulationEngine(
    sampleRace,
    location,
    raceTrackInfo,
    statsAnalysis,
    jockeyStats,
    trainerStats,
    moistureIndexInput
);

console.log("\n엔진을 가동합니다... (10000번의 몬테카를로 시뮬레이션 중)");
const results = engine.runSimulation();

console.log("\n=== 몬테카를로 시뮬레이션 결과 ===");
console.log("순위 | 마번 | 전개방식 | 예상 평균시간 | 분산(기복) | 우승 확률");
console.log("---------------------------------------------------------------");

results.forEach((r, idx) => {
    // 예상 시간을 '분:초.소수점' 형태로 포맷팅
    const mm = Math.floor(r.expectedTime / 60);
    const ss = (r.expectedTime % 60).toFixed(2);
    const timeFormat = mm > 0 ? `${mm}:${ss.padStart(5, '0')}` : ss;
    
    console.log(`${(idx + 1).toString().padStart(2)}위 | ${r.horse_no.toString().padStart(2)}번 | ${r.style.padStart(4)} | ${timeFormat.padStart(7)} | ${r.stdDev.toFixed(2).padStart(4)} | ${r.winProbability.toFixed(1)}%`);
});

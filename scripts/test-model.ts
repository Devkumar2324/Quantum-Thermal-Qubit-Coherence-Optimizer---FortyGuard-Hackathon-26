// Quick verification of the scientific model.
import { estimateCoherence } from "../src/lib/scientific/quantum";
import { DEFAULT_CONFIG } from "../src/lib/scientific/types";
import { runOptimization } from "../src/lib/scientific/optimizer";

console.log("=== Coherence vs Temperature ===");
for (let t = 10; t <= 100; t += 10) {
  const e = estimateCoherence(t, DEFAULT_CONFIG);
  console.log(
    `T=${t} mK: coherence=${(e.coherenceScore * 100).toFixed(1)}%  T1=${e.T1Microseconds.toFixed(1)}us  T2=${e.T2Microseconds.toFixed(1)}us  noise=${(e.thermalNoise * 100).toFixed(1)}%  risk=${e.decoherenceRisk}`,
  );
}

console.log("\n=== Full optimization ===");
const result = runOptimization({
  config: DEFAULT_CONFIG,
  ambientC: 25,
  weights: { coherence: 0.7, energy: 0.3 },
  minCoherence: 0.85,
});

console.log(`Optimal: T=${result.optimal?.temperatureMK} mK`);
console.log(`  Coherence: ${((result.optimal?.coherenceScore ?? 0) * 100).toFixed(1)}%`);
console.log(`  T1: ${result.optimal?.T1Microseconds.toFixed(1)} us`);
console.log(`  T2: ${result.optimal?.T2Microseconds.toFixed(1)} us`);
console.log(`  Energy: ${result.optimal?.energyConsumptionKWh.toFixed(2)} kWh/day`);
console.log(`  Risk: ${result.optimal?.decoherenceRisk}`);
console.log(`Baseline energy: ${result.baseline.energyKWh.toFixed(2)} kWh/day`);
console.log(`Energy savings: ${result.metrics.energySavingPercent.toFixed(1)}%`);
console.log(`Feasible: ${result.metrics.feasibleCount}/${result.metrics.feasibleCount + result.metrics.infeasibleCount}`);
console.log(`Pareto points: ${result.metrics.paretoCount}`);
console.log(`No feasible: ${result.noFeasibleSolution}`);
console.log(`Message: ${result.message}`);

// Shared scientific types for the Quantum-Thermal Qubit Coherence Optimizer.
// All values are SIMULATION/RESEARCH APPROXIMATION unless explicitly labeled otherwise.

export type QubitType =
  | "superconducting"
  | "trapped-ion"
  | "spin-qubit"
  | "photonic";

export interface QuantumSystemConfig {
  id?: string;
  name: string;
  qubitType: QubitType;
  qubitCount: number;
  qubitFrequencyGHz: number;   // ω_q / 2π
  targetCoherence: number;     // 0..1
  targetT1Microseconds: number;
  targetT2Microseconds: number;
  minCoherence: number;        // hard constraint for optimization
  temperatureMinMK: number;    // mK
  temperatureMaxMK: number;
  temperatureStepMK: number;
  noiseParams: NoiseParameters;
  coolingParams: CoolingParameters;
}

export interface NoiseParameters {
  // Quasi-1/f flux noise amplitude (dimensionless, relative)
  fluxNoiseAmplitude: number;
  // Charge dispersion factor (dimensionless)
  chargeNoiseFactor: number;
  // Photon shot noise occupation
  photonOccupation: number;
  // Material impurity dephasing rate baseline (1/s)
  impurityDephasingRate: number;
}

export interface CoolingParameters {
  // Carnot-style cooling efficiency fraction (0..1) - realistic cryo systems ~0.05-0.2
  carnotEfficiency: number;
  // Base system heat load in watts
  baseHeatLoadWatts: number;
  // Thermal conductance factor W/K
  thermalConductance: number;
  // Baseline aggressive cooling target in mK (for "fixed aggressive" baseline strategy)
  baselineTargetMK: number;
  // Effective cryostat roof area in m² (for solar heat gain calculation)
  roofAreaM2: number;
  // Solar absorptivity of cryostat exterior (0..1, default 0.3 for reflective coating)
  solarAbsorptivity: number;
}

export interface EnvironmentalConditions {
  temperatureC: number;
  humidityPercent?: number;
  wetBulbC?: number;
  heatIndexC?: number;
  apparentTemperatureC?: number;
  solarGHI?: number;       // Global Horizontal Irradiance W/m²
  solarDNI?: number;       // Direct Normal Irradiance W/m²
  solarDHI?: number;       // Diffuse Horizontal Irradiance W/m²
  precipitationMm?: number;
  cloudCoverOctas?: number;
  elevationM?: number;
  airQualityIndex?: number;
  co2Ppm?: number;
}

export interface ThermalObservation {
  id?: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  temperatureC: number;
  source: "fortyguard" | "simulation" | "synthetic";
  quality: "good" | "degraded" | "unknown";
  scenario?: string;
  metadata?: Record<string, unknown>;
  // Environmental context (populated when source is FortyGuard env_params)
  environment?: EnvironmentalConditions;
}

export type Scenario =
  | "normal"
  | "hot"
  | "extreme-heat"
  | "rapid-increase"
  | "temperature-anomaly";

export interface ThermalProcessed {
  current: number;
  movingAverage: number;
  anomaly: number;       // deviation from MA
  rateOfChange: number;  // C per hour
  forecast: number;      // next-step forecast
  history: number[];
  forecastSeries: number[];
}

export interface CoherenceEstimate {
  temperatureMK: number;
  thermalNoise: number;          // dimensionless normalized thermal noise
  thermalPopulation: number;     // n_bar
  T1Microseconds: number;
  T2Microseconds: number;
  T2StarMicroseconds: number;
  coherenceScore: number;        // 0..1
  decoherenceRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface CoolingEstimate {
  ambientC: number;
  targetMK: number;
  coolingPowerWatts: number;
  energyConsumptionKWh: number;  // modeled per day
  relativeEnergy: number;        // normalized 0..1 against max in sweep
  carnotEfficiency: number;
  cop: number;                   // coefficient of performance
}

export interface SweepPoint extends CoherenceEstimate, CoolingEstimate {
  objectiveScore: number;
  feasible: boolean;
}

export interface OptimizationResult {
  experimentId?: string;
  sweep: SweepPoint[];
  pareto: SweepPoint[];
  optimal: SweepPoint | null;
  baseline: {
    point: SweepPoint;
    energyKWh: number;
    coherence: number;
  };
  metrics: {
    energySavingPercent: number;
    coherenceDelta: number;
    riskDelta: number;
    feasibleCount: number;
    infeasibleCount: number;
    paretoCount: number;
    optimizationScore: number;
  };
  weights: { coherence: number; energy: number };
  minCoherence: number;
  noFeasibleSolution: boolean;
  message?: string;
}

export interface OptimizationRequest {
  config: QuantumSystemConfig;
  ambientC: number;
  weights: { coherence: number; energy: number };
  minCoherence?: number;
  durationHours?: number;
  // Optional environmental context from FortyGuard env_params
  environment?: EnvironmentalConditions;
}

// =====================================================================
// Three-Strategy Comparison (the centerpiece research contribution)
// =====================================================================

export type Strategy = "fixed" | "reactive" | "predictive";

export interface StrategyStep {
  hour: number;            // 0..N
  timestamp: string;
  ambientC: number;
  environment?: EnvironmentalConditions;
  selectedTempMK: number;
  coherence: number;
  coolingEnergyKWh: number;
  feasible: boolean;
  constraintViolated: boolean;
}

export interface StrategyResult {
  strategy: Strategy;
  steps: StrategyStep[];
  totalEnergyKWh: number;
  minCoherence: number;
  maxCoherence: number;
  meanCoherence: number;
  constraintViolations: number;
  totalHours: number;
  description: string;
}

export interface StrategyComparison {
  fixed: StrategyResult;
  reactive: StrategyResult;
  predictive: StrategyResult;
  savings: {
    reactiveVsFixed: number;       // % energy savings
    predictiveVsFixed: number;
    predictiveVsReactive: number;
  };
  forecastWindow: {
    start: string;
    end: string;
    hours: number;
    source: "fortyguard" | "synthetic";
  };
  config: QuantumSystemConfig;
  minCoherence: number;
}

export const DEFAULT_NOISE: NoiseParameters = {
  fluxNoiseAmplitude: 1e-6,
  chargeNoiseFactor: 0.02,
  photonOccupation: 0.1,
  impurityDephasingRate: 1e3, // 1/s, baseline material impurity
};

export const DEFAULT_COOLING: CoolingParameters = {
  carnotEfficiency: 0.12,
  baseHeatLoadWatts: 0.05,
  thermalConductance: 0.001,
  baselineTargetMK: 15, // aggressive baseline
  roofAreaM2: 4.0,       // ~4 m² cryostat footprint
  solarAbsorptivity: 0.3, // reflective coating
};

export const DEFAULT_CONFIG: QuantumSystemConfig = {
  name: "Demo Superconducting Qubit System",
  qubitType: "superconducting",
  qubitCount: 50,
  qubitFrequencyGHz: 5.0,
  targetCoherence: 0.9,
  targetT1Microseconds: 100,
  targetT2Microseconds: 80,
  minCoherence: 0.85,
  temperatureMinMK: 10,
  temperatureMaxMK: 100,
  temperatureStepMK: 2,
  noiseParams: DEFAULT_NOISE,
  coolingParams: DEFAULT_COOLING,
};

export const SCENARIOS: Record<Scenario, {
  label: string;
  description: string;
  ambientC: number;
  volatility: number;
  trend: number;
}> = {
  normal: {
    label: "Normal Ambient",
    description: "Stable room temperature ~25°C with mild diurnal variation.",
    ambientC: 25,
    volatility: 1.5,
    trend: 0,
  },
  hot: {
    label: "Hot Ambient",
    description: "Sustained hot conditions ~38°C, common in summer datacenters.",
    ambientC: 38,
    volatility: 2.0,
    trend: 0.05,
  },
  "extreme-heat": {
    label: "Extreme Heat",
    description: "Heat-wave conditions ~46°C with high thermal stress.",
    ambientC: 46,
    volatility: 3.0,
    trend: 0.15,
  },
  "rapid-increase": {
    label: "Rapid Temperature Increase",
    description: "Ambient rises sharply over 6 hours, +8°C swing.",
    ambientC: 32,
    volatility: 2.5,
    trend: 1.2,
  },
  "temperature-anomaly": {
    label: "Temperature Anomaly",
    description: "Spike anomaly, +6°C above expected baseline.",
    ambientC: 33,
    volatility: 4.0,
    trend: 0,
  },
};

// =====================================================================
// Demo City Presets
// FortyGuard API supports US-only locations.
// These cities span diverse climate zones for strategy comparison demos.
// =====================================================================

export interface CityPreset {
  id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
  climate: string;
  rationale: string;
}

export const DEMO_CITIES: CityPreset[] = [
  {
    id: "phoenix",
    name: "Phoenix",
    state: "AZ",
    lat: 33.4484,
    lon: -112.074,
    climate: "Hot desert",
    rationale:
      "Extreme summer heat (45°C+), very low humidity. Best demo of cooling load and solar heat gain.",
  },
  {
    id: "austin",
    name: "Austin",
    state: "TX",
    lat: 30.2672,
    lon: -97.7431,
    climate: "Humid subtropical",
    rationale:
      "High heat + high humidity. Best demo of wet-bulb cooling limits and humidity COP adjustment.",
  },
  {
    id: "nyc",
    name: "New York",
    state: "NY",
    lat: 40.7128,
    lon: -74.006,
    climate: "Humid continental",
    rationale:
      "Variable climate with strong diurnal swing. Best demo of forecast-driven predictive optimization.",
  },
  {
    id: "seattle",
    name: "Seattle",
    state: "WA",
    lat: 47.6062,
    lon: -122.3321,
    climate: "Oceanic",
    rationale:
      "Mild, cloudy, low solar load. Good baseline for comparing against extreme cities.",
  },
  {
    id: "miami",
    name: "Miami",
    state: "FL",
    lat: 25.7617,
    lon: -80.1918,
    climate: "Tropical monsoon",
    rationale:
      "Sustained high humidity and temperature. Stress test for wet-bulb limits.",
  },
  {
    id: "denver",
    name: "Denver",
    state: "CO",
    lat: 39.7392,
    lon: -104.9903,
    climate: "Semi-arid",
    rationale:
      "High elevation, low air density, intense solar irradiance. Solar heat gain demo.",
  },
];

export function getCity(id: string): CityPreset {
  return DEMO_CITIES.find((c) => c.id === id) ?? DEMO_CITIES[0];
}

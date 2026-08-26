// Cooling Energy Model
// =====================================================================
// SIMULATION / RESEARCH APPROXIMATION
//
// Modeled (not measured) cooling energy for cryogenic quantum systems.
// Uses Carnot-efficiency approximation enhanced with three environmental
// terms sourced from the FortyGuard Environmental Parameters API:
//
//   1. Solar heat gain       — Q_solar = α * GHI * A_roof
//   2. Humidity COP penalty  — high humidity reduces cooling tower COP
//   3. Wet-bulb temperature  — evaporative cooling cannot cool below T_wb
//
// Core equations:
//   COP_carnot = T_cold / (T_hot - T_cold)
//   COP_real   = η * COP_carnot * humidity_factor
//   Q_load     = Q_base + Q_conductive + Q_solar
//   P_cooling  = Q_load / COP_real + P_baseline
//
// where:
//   T_cold = qubit operating temperature (K)
//   T_hot  = ambient temperature (K)
//   η      = carnot efficiency fraction (0.05..0.2 typical)
//   humidity_factor ∈ [0.7, 1.0] — degrades with high humidity
//   Q_solar = solar_absorptivity * GHI * roof_area (W)
//   P_baseline = 1500 W (compressor/circulator overhead)
//
// References (conceptual):
//   - Carnot, S. (1824). Reflections on the Motive Power of Fire.
//   - Pobell, F. (2007). Matter and Methods at Low Temperatures.
//   - ASHRAE Handbook: HVAC Applications (cooling tower performance).
//   - Stull, R. (2011). Wet-Bulb Temperature from Relative Humidity and Air
//     Temperature. J. Appl. Meteor. Climatol.
// =====================================================================

import { QuantumSystemConfig, CoolingEstimate, EnvironmentalConditions } from "./types";
import { mkToK } from "./quantum";
import { cToK } from "./thermal";

/**
 * Compute humidity-based COP adjustment factor.
 *
 * High humidity reduces the effectiveness of cooling towers and pre-cooling
 * stages. We model this as a multiplicative factor in [0.7, 1.0]:
 *   - 0% humidity  → 1.0 (no penalty, ideal dry cooling)
 *   - 50% humidity → ~0.93 (small penalty)
 *   - 100% humidity → 0.70 (significant penalty)
 *
 * This is a research approximation. Real cooling tower performance depends
 * on wet-bulb temperature, approach temperature, and range.
 */
export function humidityCOPFactor(humidityPercent: number | undefined): number {
  if (humidityPercent === undefined) return 1.0;
  const h = Math.max(0, Math.min(100, humidityPercent));
  // Linear interpolation: 1.0 at 0%, 0.7 at 100%
  return 1.0 - 0.3 * (h / 100);
}

/**
 * Solar heat gain on the cryostat exterior.
 *
 *   Q_solar = solar_absorptivity * GHI * roof_area  (watts)
 *
 * GHI (Global Horizontal Irradiance) comes from FortyGuard env_params.
 * Typical peak GHI: 1000 W/m² at noon on a clear day.
 */
export function solarHeatGain(
  ghi: number | undefined,
  config: QuantumSystemConfig,
): number {
  if (ghi === undefined || ghi <= 0) return 0;
  const { solarAbsorptivity, roofAreaM2 } = config.coolingParams;
  return solarAbsorptivity * ghi * roofAreaM2;
}

/**
 * Compute wet-bulb temperature from dry-bulb temperature and humidity.
 * Uses the Stull (2011) approximation, valid for typical conditions.
 *
 *   T_wb = T * atan(0.151977 * (RH + 8.313659)^0.5)
 *          + atan(T + RH)
 *          - atan(RH - 1.676331)
 *          + 0.00391838 * RH^1.5 * atan(0.023101 * RH)
 *          - 4.686035
 *
 * where T is in °C and RH is in percent.
 */
export function wetBulbFromRH(
  tempC: number,
  humidityPercent: number | undefined,
): number | undefined {
  if (humidityPercent === undefined) return undefined;
  const T = tempC;
  const RH = Math.max(0, Math.min(100, humidityPercent));
  const twb =
    T * Math.atan(0.151977 * Math.sqrt(RH + 8.313659)) +
    Math.atan(T + RH) -
    Math.atan(RH - 1.676331) +
    0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) -
    4.686035;
  return twb;
}

/**
 * Wet-bulb cooling limit factor.
 *
 * Evaporative pre-cooling stages cannot cool below the wet-bulb temperature.
 * If the ambient wet-bulb approaches the target cold temperature, the COP
 * degrades sharply. We model this as an additional multiplicative factor.
 */
export function wetBulbLimitFactor(
  ambientC: number,
  targetMK: number,
  wetBulbC: number | undefined,
): number {
  if (wetBulbC === undefined) return 1.0;
  // Convert target mK to °C
  const targetC = targetMK / 1000 - 273.15;
  // If target is way below wet-bulb (always true for cryogenic), we need
  // multi-stage cooling. The first stage (evaporative) is bounded by T_wb.
  // We model the penalty as a function of (T_ambient - T_wb): smaller gap
  // means evaporative stage contributes less.
  const evapRange = Math.max(0, ambientC - wetBulbC);
  // If evapRange is large (>10°C), evaporative pre-cooling is very effective.
  // If small (<2°C), it contributes almost nothing.
  // Factor in [0.85, 1.0]: small penalty when evap range is small.
  const factor = 0.85 + 0.15 * Math.min(1, evapRange / 10);
  return factor;
}

export function calculateCoolingPower(
  ambientC: number,
  targetMK: number,
  config: QuantumSystemConfig,
  environment?: EnvironmentalConditions,
): { power: number; cop: number; carnotCop: number; qLoad: number; qSolar: number } {
  const T_cold = mkToK(targetMK);
  const T_hot = cToK(ambientC);
  const dT = Math.max(0.001, T_hot - T_cold);

  // Carnot COP (theoretical maximum)
  const carnotCop = T_cold / dT;
  const eta = config.coolingParams.carnotEfficiency;

  // Environmental adjustments
  const humidityFactor = humidityCOPFactor(environment?.humidityPercent);
  const wbFactor = wetBulbLimitFactor(
    ambientC,
    targetMK,
    environment?.wetBulbC ?? wetBulbFromRH(ambientC, environment?.humidityPercent),
  );
  const cop = Math.max(1e-12, eta * carnotCop * humidityFactor * wbFactor);

  // Heat load: base + conductive leak + solar gain
  const conductiveLeak = config.coolingParams.thermalConductance * dT;
  const qSolar = solarHeatGain(environment?.solarGHI, config);
  const qLoad = config.coolingParams.baseHeatLoadWatts + conductiveLeak + qSolar;

  // Practical cooling power = Q_load / COP + baseline overhead
  const baselineOverheadWatts = 1500; // 1.5 kW baseline
  const carnotPower = qLoad / cop;
  const power = baselineOverheadWatts + carnotPower;
  return { power, cop, carnotCop, qLoad, qSolar };
}

export function calculateEnergyConsumption(
  ambientC: number,
  targetMK: number,
  config: QuantumSystemConfig,
  durationHours = 24,
  environment?: EnvironmentalConditions,
): number {
  const { power } = calculateCoolingPower(ambientC, targetMK, config, environment);
  return (power * durationHours) / 1000; // kWh
}

export function calculateRelativeEnergy(
  energyKWh: number,
  maxEnergyKWh: number,
): number {
  if (maxEnergyKWh <= 0) return 0;
  return Math.max(0, Math.min(1, energyKWh / maxEnergyKWh));
}

export function estimateCooling(
  ambientC: number,
  targetMK: number,
  config: QuantumSystemConfig,
  maxEnergyKWh?: number,
  durationHours = 24,
  environment?: EnvironmentalConditions,
): CoolingEstimate {
  const { power, cop } = calculateCoolingPower(ambientC, targetMK, config, environment);
  const energyConsumptionKWh = calculateEnergyConsumption(
    ambientC,
    targetMK,
    config,
    durationHours,
    environment,
  );
  const rel = maxEnergyKWh
    ? calculateRelativeEnergy(energyConsumptionKWh, maxEnergyKWh)
    : 0;
  return {
    ambientC,
    targetMK,
    coolingPowerWatts: power,
    energyConsumptionKWh,
    relativeEnergy: rel,
    carnotEfficiency: config.coolingParams.carnotEfficiency,
    cop,
  };
}

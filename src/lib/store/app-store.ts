// Global application state — Zustand store.
// Holds the active section, current quantum configuration, optimization
// weights, thermal observations, and the latest optimization result.

"use client";

import { create } from "zustand";
import {
  DEFAULT_CONFIG,
  OptimizationResult,
  QuantumSystemConfig,
  Scenario,
  ThermalObservation,
} from "@/lib/scientific/types";

export type SectionId =
  | "dashboard"
  | "thermal"
  | "quantum-system"
  | "optimizer"
  | "strategies"
  | "experiments"
  | "results"
  | "research"
  | "agent"
  | "settings";

interface AppState {
  activeSection: SectionId;
  setActiveSection: (s: SectionId) => void;

  config: QuantumSystemConfig;
  setConfig: (c: QuantumSystemConfig) => void;
  updateConfig: (patch: Partial<QuantumSystemConfig>) => void;
  updateNoiseParams: (patch: Partial<QuantumSystemConfig["noiseParams"]>) => void;
  updateCoolingParams: (patch: Partial<QuantumSystemConfig["coolingParams"]>) => void;

  weights: { coherence: number; energy: number };
  setWeights: (w: { coherence: number; energy: number }) => void;

  minCoherence: number;
  setMinCoherence: (v: number) => void;

  scenario: Scenario;
  setScenario: (s: Scenario) => void;

  ambientC: number;
  setAmbientC: (v: number) => void;

  thermal: ThermalObservation[];
  setThermal: (t: ThermalObservation[]) => void;

  optimization: OptimizationResult | null;
  setOptimization: (r: OptimizationResult | null) => void;

  lastExperimentId: string | null;
  setLastExperimentId: (id: string | null) => void;

  fortyGuardStatus: "available" | "simulation" | "checking";
  setFortyGuardStatus: (s: "available" | "simulation" | "checking") => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeSection: "dashboard",
  setActiveSection: (s) => set({ activeSection: s }),

  config: DEFAULT_CONFIG,
  setConfig: (c) => set({ config: c }),
  updateConfig: (patch) =>
    set((state) => ({ config: { ...state.config, ...patch } })),
  updateNoiseParams: (patch) =>
    set((state) => ({
      config: {
        ...state.config,
        noiseParams: { ...state.config.noiseParams, ...patch },
      },
    })),
  updateCoolingParams: (patch) =>
    set((state) => ({
      config: {
        ...state.config,
        coolingParams: { ...state.config.coolingParams, ...patch },
      },
    })),

  weights: { coherence: 0.7, energy: 0.3 },
  setWeights: (w) => set({ weights: w }),

  minCoherence: 0.85,
  setMinCoherence: (v) => set({ minCoherence: v }),

  scenario: "normal",
  setScenario: (s) => set({ scenario: s }),

  ambientC: 25,
  setAmbientC: (v) => set({ ambientC: v }),

  thermal: [],
  setThermal: (t) => set({ thermal: t }),

  optimization: null,
  setOptimization: (r) => set({ optimization: r }),

  lastExperimentId: null,
  setLastExperimentId: (id) => set({ lastExperimentId: id }),

  fortyGuardStatus: "simulation",
  setFortyGuardStatus: (s) => set({ fortyGuardStatus: s }),
}));

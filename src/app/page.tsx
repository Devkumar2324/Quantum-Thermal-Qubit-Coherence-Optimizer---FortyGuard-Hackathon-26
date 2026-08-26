"use client";

import { useEffect } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { TopBar } from "@/components/dashboard/top-bar";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { ThermalSection } from "@/components/dashboard/thermal-section";
import { QuantumSystemSection } from "@/components/dashboard/quantum-system-section";
import { OptimizerSection } from "@/components/dashboard/optimizer-section";
import { StrategyComparisonSection } from "@/components/dashboard/strategy-comparison-section";
import { ExperimentsSection } from "@/components/dashboard/experiments-section";
import { ResultsSection } from "@/components/dashboard/results-section";
import { ResearchSection } from "@/components/dashboard/research-section";
import { AgentSection } from "@/components/dashboard/agent-section";
import { SettingsSection } from "@/components/dashboard/settings-section";
import { useAppStore } from "@/lib/store/app-store";
import { generateSyntheticHistory } from "@/lib/scientific/thermal";
import { SCENARIOS } from "@/lib/scientific/types";

export default function Home() {
  const activeSection = useAppStore((s) => s.activeSection);
  const thermal = useAppStore((s) => s.thermal);
  const setThermal = useAppStore((s) => s.setThermal);
  const setAmbientC = useAppStore((s) => s.setAmbientC);
  const scenario = useAppStore((s) => s.scenario);

  // Seed initial thermal history on mount
  useEffect(() => {
    if (thermal.length === 0) {
      const initial = generateSyntheticHistory(scenario, 24);
      setThermal(initial);
      setAmbientC(initial[initial.length - 1].temperatureC);
    }
  }, [thermal.length, scenario, setThermal, setAmbientC]);

  return (
    <div className="flex h-screen overflow-hidden bg-background grid-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          {activeSection === "dashboard" && <DashboardSection />}
          {activeSection === "thermal" && <ThermalSection />}
          {activeSection === "quantum-system" && <QuantumSystemSection />}
          {activeSection === "optimizer" && <OptimizerSection />}
          {activeSection === "strategies" && <StrategyComparisonSection />}
          {activeSection === "experiments" && <ExperimentsSection />}
          {activeSection === "results" && <ResultsSection />}
          {activeSection === "research" && <ResearchSection />}
          {activeSection === "agent" && <AgentSection />}
          {activeSection === "settings" && <SettingsSection />}
        </main>
      </div>
    </div>
  );
}

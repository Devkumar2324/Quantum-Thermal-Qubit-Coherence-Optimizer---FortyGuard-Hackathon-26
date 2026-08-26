"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { SCENARIOS } from "@/lib/scientific/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, RefreshCw } from "lucide-react";

const SECTION_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Real-time overview of thermal conditions and quantum operating point" },
  thermal: { title: "Thermal Environment", subtitle: "FortyGuard temperature intelligence & forecasting" },
  "quantum-system": { title: "Quantum System", subtitle: "Qubit configuration and operating parameters" },
  optimizer: { title: "Multi-Objective Optimizer", subtitle: "Coherence vs cooling energy trade-off analysis" },
  strategies: { title: "Strategy Comparison", subtitle: "Fixed vs Reactive vs Predictive — the novel research contribution" },
  experiments: { title: "Experiment Engine", subtitle: "Reproducible research runs across scenarios" },
  results: { title: "Results & Comparison", subtitle: "Baseline vs optimized operating strategy" },
  research: { title: "Research Charts", subtitle: "Scientific visualization of model outputs" },
  agent: { title: "AI Thermal Agent", subtitle: "Autonomous analysis and recommendation" },
  settings: { title: "Settings", subtitle: "API credentials, weights, model parameters" },
};

export function TopBar() {
  const activeSection = useAppStore((s) => s.activeSection);
  const scenario = useAppStore((s) => s.scenario);
  const setScenario = useAppStore((s) => s.setScenario);
  const ambientC = useAppStore((s) => s.ambientC);
  const fortyGuardStatus = useAppStore((s) => s.fortyGuardStatus);
  const setFortyGuardStatus = useAppStore((s) => s.setFortyGuardStatus);

  const meta = SECTION_TITLES[activeSection] ?? SECTION_TITLES.dashboard;

  // Check FortyGuard health on mount
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function check() {
      setChecking(true);
      setFortyGuardStatus("checking");
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        if (!cancelled) {
          setFortyGuardStatus(data.fortyGuardAvailable ? "available" : "simulation");
        }
      } catch {
        if (!cancelled) setFortyGuardStatus("simulation");
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [setFortyGuardStatus]);

  return (
    <header className="h-16 shrink-0 border-b border-border bg-card/40 backdrop-blur-sm flex items-center px-6 gap-4">
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold leading-tight truncate">{meta.title}</h1>
        <p className="text-xs text-muted-foreground leading-tight truncate">
          {meta.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Scenario selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Scenario:</span>
          <Select
            value={scenario}
            onValueChange={(v) => setScenario(v as typeof scenario)}
          >
            <SelectTrigger className="w-44 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SCENARIOS).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ambient readout */}
        <Badge variant="outline" className="text-mono">
          {ambientC.toFixed(1)}°C ambient
        </Badge>

        {/* Status */}
        {fortyGuardStatus === "available" ? (
          <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
            FortyGuard Live
          </Badge>
        ) : fortyGuardStatus === "checking" ? (
          <Badge variant="outline" className="text-muted-foreground">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Checking
          </Badge>
        ) : (
          <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30">
            Simulation Mode
          </Badge>
        )}
      </div>
    </header>
  );
}

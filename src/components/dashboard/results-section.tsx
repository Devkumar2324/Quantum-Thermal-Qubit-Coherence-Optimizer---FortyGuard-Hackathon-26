"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import {
  ResponsiveContainer as R,
  ScatterChart,
  Scatter,
} from "recharts";
import { useAppStore } from "@/lib/store/app-store";
import { ArrowLeft, BarChart3, Zap, Target, TrendingDown } from "lucide-react";
import { ParetoChart } from "@/components/charts/pareto-chart";

interface ExperimentDetail {
  id: string;
  name: string;
  scenario: string;
  ambientTemp: number;
  tempMin: number;
  tempMax: number;
  tempStep: number;
  coherenceWeight: number;
  energyWeight: number;
  minCoherence: number;
  status: string;
  optimalTemp: number | null;
  optimalCoherence: number | null;
  optimalEnergy: number | null;
  baselineEnergy: number | null;
  energySavings: number | null;
  createdAt: string;
  config?: { name: string; qubitType: string; qubitCount: number };
  paretoFrontier: any[];
  sweepResults: any[];
}

export function ResultsSection() {
  const lastExperimentId = useAppStore((s) => s.lastExperimentId);
  const optimization = useAppStore((s) => s.optimization);
  const setActiveSection = useAppStore((s) => s.setActiveSection);
  const [exp, setExp] = useState<ExperimentDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!lastExperimentId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/experiments/${lastExperimentId}`);
        if (res.ok) {
          const data = await res.json();
          setExp(data.experiment);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [lastExperimentId]);

  // Use DB experiment OR live optimization
  const sourceOpt = exp
    ? {
        sweep: exp.sweepResults,
        pareto: exp.paretoFrontier,
        optimal: exp.sweepResults.find((p) => p.temperatureMK === exp.optimalTemp) ?? null,
        baseline: {
          point: exp.sweepResults.find((p) => p.temperatureMK === 15) ?? exp.sweepResults[0],
          energyKWh: exp.baselineEnergy ?? 0,
          coherence: 0,
        },
        metrics: {
          energySavingPercent: exp.energySavings ?? 0,
          feasibleCount: exp.sweepResults.filter((p) => p.feasible).length,
          infeasibleCount: exp.sweepResults.filter((p) => !p.feasible).length,
          paretoCount: exp.paretoFrontier.length,
          coherenceDelta: 0,
          riskDelta: 0,
          optimizationScore: 0,
        },
        weights: { coherence: exp.coherenceWeight, energy: exp.energyWeight },
        minCoherence: exp.minCoherence,
        noFeasibleSolution: exp.status === "infeasible",
      }
    : optimization;

  if (!sourceOpt) {
    return (
      <Card className="border-border bg-card/60">
        <CardContent className="p-8 text-center">
          <div className="text-sm text-muted-foreground">
            No results to display. Run the optimizer first.
          </div>
          <Button
            className="mt-4"
            onClick={() => setActiveSection("optimizer")}
          >
            Go to Optimizer
          </Button>
        </CardContent>
      </Card>
    );
  }

  const baselineData = [
    {
      name: "Baseline",
      energy: sourceOpt.baseline.energyKWh,
      coherence: (sourceOpt.baseline.point?.coherenceScore ?? 0) * 100,
      color: "oklch(0.68 0.22 350)",
    },
    {
      name: "Optimized",
      energy: sourceOpt.optimal?.energyConsumptionKWh ?? 0,
      coherence: (sourceOpt.optimal?.coherenceScore ?? 0) * 100,
      color: "oklch(0.78 0.15 200)",
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card/60">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setActiveSection("experiments")}
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Back
            </Button>
            <div>
              <div className="text-sm font-medium">
                {exp?.name ?? "Live Optimization Result"}
              </div>
              {exp && (
                <div className="text-[10px] text-muted-foreground">
                  {exp.config?.name} · {exp.scenario} · {exp.ambientTemp.toFixed(1)}°C ·{" "}
                  {new Date(exp.createdAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
          <Badge
            className={
              sourceOpt.noFeasibleSolution
                ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
            }
          >
            {sourceOpt.noFeasibleSolution ? "INFEASIBLE" : "COMPLETED"}
          </Badge>
        </CardContent>
      </Card>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="stat-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="data-label">Optimal Temp</span>
              <Target className="w-3.5 h-3.5 text-cyan-300" />
            </div>
            <div className="data-value">
              {sourceOpt.optimal ? `${sourceOpt.optimal.temperatureMK.toFixed(0)} mK` : "—"}
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="data-label">Coherence</span>
              <Target className="w-3.5 h-3.5 text-emerald-300" />
            </div>
            <div className="data-value">
              {sourceOpt.optimal ? `${(sourceOpt.optimal.coherenceScore * 100).toFixed(1)}%` : "—"}
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="data-label">Modeled Energy</span>
              <Zap className="w-3.5 h-3.5 text-orange-300" />
            </div>
            <div className="data-value">
              {sourceOpt.optimal ? `${sourceOpt.optimal.energyConsumptionKWh.toFixed(2)} kWh` : "—"}
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="data-label">Energy Savings</span>
              <TrendingDown className="w-3.5 h-3.5 text-emerald-300" />
            </div>
            <div className="data-value text-emerald-300">
              {sourceOpt.metrics.energySavingPercent.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Baseline vs Optimized */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Baseline vs Optimized — Energy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={baselineData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 240)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "oklch(0.68 0.02 240)" }} stroke="oklch(0.28 0.02 240)" />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.68 0.02 240)" }} stroke="oklch(0.28 0.02 240)" />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.18 0.025 240)",
                    border: "1px solid oklch(0.28 0.02 240)",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                  formatter={(v: number) => [`${v.toFixed(2)} kWh`, "Energy"]}
                />
                <Bar dataKey="energy" radius={[6, 6, 0, 0]}>
                  {baselineData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Baseline vs Optimized — Coherence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={baselineData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 240)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "oklch(0.68 0.02 240)" }} stroke="oklch(0.28 0.02 240)" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "oklch(0.68 0.02 240)" }} stroke="oklch(0.28 0.02 240)" />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.18 0.025 240)",
                    border: "1px solid oklch(0.28 0.02 240)",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                  formatter={(v: number) => [`${v.toFixed(2)}%`, "Coherence"]}
                />
                <Bar dataKey="coherence" radius={[6, 6, 0, 0]}>
                  {baselineData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Pareto */}
      <Card className="border-border bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Pareto Frontier (Stored)</CardTitle>
        </CardHeader>
        <CardContent>
          <ParetoChart height={320} />
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Thermometer,
  Atom,
  Activity,
  Zap,
  Target,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Snowflake,
  AlertTriangle,
} from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import { MiniTrendChart } from "@/components/charts/mini-trend-chart";
import { ParetoChart } from "@/components/charts/pareto-chart";
import { TempCoherenceChart } from "@/components/charts/temp-coherence-chart";
import { useEffect } from "react";

const RISK_CLASS: Record<string, string> = {
  LOW: "badge-risk-low",
  MEDIUM: "badge-risk-medium",
  HIGH: "badge-risk-high",
  CRITICAL: "badge-risk-critical",
};

export function DashboardSection() {
  const thermal = useAppStore((s) => s.thermal);
  const config = useAppStore((s) => s.config);
  const optimization = useAppStore((s) => s.optimization);
  const ambientC = useAppStore((s) => s.ambientC);
  const scenario = useAppStore((s) => s.scenario);
  const setActiveSection = useAppStore((s) => s.setActiveSection);

  const currentTemp =
    thermal.length > 0 ? thermal[thermal.length - 1].temperatureC : ambientC;
  const prevTemp =
    thermal.length > 1 ? thermal[thermal.length - 2].temperatureC : currentTemp;
  const tempDelta = currentTemp - prevTemp;

  const opt = optimization?.optimal;
  const baseline = optimization?.baseline;
  const savings = optimization?.metrics.energySavingPercent ?? 0;
  const coherence = opt?.coherenceScore ?? 0;
  const risk = opt?.decoherenceRisk ?? "—";

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          label="Ambient Temp"
          value={`${currentTemp.toFixed(1)}°C`}
          icon={Thermometer}
          trend={tempDelta}
          trendUnit="°C"
          accent="cyan"
        />
        <KpiCard
          label="Operating Point"
          value={opt ? `${opt.temperatureMK.toFixed(0)} mK` : "—"}
          icon={Snowflake}
          accent="cyan"
          sub={opt ? `COP ${opt.cop.toFixed(2)}` : undefined}
        />
        <KpiCard
          label="Coherence"
          value={opt ? `${(coherence * 100).toFixed(1)}%` : "—"}
          icon={Target}
          accent="green"
          sub={opt ? risk : undefined}
          subClass={opt ? RISK_CLASS[risk] : undefined}
        />
        <KpiCard
          label="Cooling Energy"
          value={opt ? `${opt.energyConsumptionKWh.toFixed(1)} kWh` : "—"}
          icon={Zap}
          accent="orange"
          sub="/day modeled"
        />
        <KpiCard
          label="Baseline Energy"
          value={baseline ? `${baseline.energyKWh.toFixed(1)} kWh` : "—"}
          icon={Activity}
          accent="pink"
          sub="aggressive cooling"
        />
        <KpiCard
          label="Energy Savings"
          value={`${savings.toFixed(1)}%`}
          icon={TrendingUp}
          accent="green"
          trend={savings}
          trendUnit="%"
          sub="modeled"
        />
      </div>

      {/* Status Banner */}
      <Card className="border-border bg-card/60">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/30 to-teal-700/30 flex items-center justify-center">
              <Atom className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-medium">
                {config.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {config.qubitCount} qubits · {config.qubitType} · {config.qubitFrequencyGHz} GHz · scenario: {scenario}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {optimization ? (
              <Badge
                className={
                  optimization.noFeasibleSolution
                    ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                    : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                }
              >
                {optimization.noFeasibleSolution ? "NO FEASIBLE SOLUTION" : "OPTIMAL"}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                NOT OPTIMIZED
              </Badge>
            )}
            <Badge variant="outline" className="text-mono">
              Coherence ≥ {(config.minCoherence * 100).toFixed(0)}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Temperature vs Coherence
              <span className="ml-auto text-xs text-muted-foreground font-normal">
                sweep across {optimization?.sweep.length ?? 0} candidates
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <TempCoherenceChart />
          </CardContent>
        </Card>

        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Ambient Trend
              <span className="ml-auto text-xs text-muted-foreground font-normal">
                last {thermal.length}h
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <MiniTrendChart />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Pareto Frontier
              <span className="ml-auto text-xs text-muted-foreground font-normal">
                coherence vs energy trade-off
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ParetoChart height={280} />
          </CardContent>
        </Card>

        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Optimization Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {!optimization && (
              <div className="text-xs text-muted-foreground py-6 text-center">
                No optimization run yet.
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 block mx-auto"
                  onClick={() => setActiveSection("optimizer")}
                >
                  Run Optimizer
                </Button>
              </div>
            )}
            {optimization && (
              <>
                <SummaryRow
                  label="Recommended Temp"
                  value={opt ? `${opt.temperatureMK.toFixed(0)} mK` : "—"}
                />
                <SummaryRow
                  label="Predicted T1"
                  value={opt ? `${opt.T1Microseconds.toFixed(1)} µs` : "—"}
                />
                <SummaryRow
                  label="Predicted T2"
                  value={opt ? `${opt.T2Microseconds.toFixed(1)} µs` : "—"}
                />
                <SummaryRow
                  label="Thermal Noise"
                  value={opt ? `${(opt.thermalNoise * 100).toFixed(1)}%` : "—"}
                />
                <SummaryRow
                  label="Feasible Solutions"
                  value={`${optimization.metrics.feasibleCount}/${optimization.metrics.feasibleCount + optimization.metrics.infeasibleCount}`}
                />
                <SummaryRow
                  label="Pareto Points"
                  value={`${optimization.metrics.paretoCount}`}
                />
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">
                      Coherence Target
                    </span>
                    <span className="text-xs font-mono">
                      {(coherence * 100).toFixed(1)}% / {(config.minCoherence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress
                    value={coherence * 100}
                    className="h-2"
                  />
                </div>
                {optimization.noFeasibleSolution && (
                  <div className="mt-2 p-2 rounded-md bg-rose-500/10 border border-rose-500/30 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-300 mt-0.5 shrink-0" />
                    <span className="text-[11px] text-rose-200">
                      No feasible solution in the current temperature range. Adjust threshold or expand range.
                    </span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUnit,
  accent,
  sub,
  subClass,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  trend?: number;
  trendUnit?: string;
  accent?: "cyan" | "green" | "orange" | "pink";
  sub?: string;
  subClass?: string;
}) {
  const accentClass: Record<string, string> = {
    cyan: "text-cyan-300",
    green: "text-emerald-300",
    orange: "text-orange-300",
    pink: "text-pink-300",
  };
  return (
    <Card className="stat-card">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="data-label">{label}</span>
          <Icon className={cn("w-3.5 h-3.5", accent ? accentClass[accent] : "text-muted-foreground")} />
        </div>
        <div className="data-value">{value}</div>
        <div className="mt-1 flex items-center gap-1.5 text-[10px]">
          {trend !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-mono",
                trend > 0 ? "text-rose-300" : trend < 0 ? "text-emerald-300" : "text-muted-foreground",
              )}
            >
              {trend > 0 ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : trend < 0 ? (
                <ArrowDownRight className="w-3 h-3" />
              ) : null}
              {Math.abs(trend).toFixed(2)}
              {trendUnit}
            </span>
          )}
          {sub && (
            <span
              className={cn(
                "px-1.5 py-0.5 rounded border text-[10px] font-medium",
                subClass ?? "border-border text-muted-foreground",
              )}
            >
              {sub}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium">{value}</span>
    </div>
  );
}

// Inline Button import to avoid circular ref issues
import { Button } from "@/components/ui/button";

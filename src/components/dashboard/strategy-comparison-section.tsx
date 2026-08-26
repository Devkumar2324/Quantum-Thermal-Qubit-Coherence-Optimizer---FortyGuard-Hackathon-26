"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import {
  Activity,
  TrendingDown,
  Zap,
  Target,
  Clock,
  MapPin,
  Trophy,
  Play,
  Sparkles,
} from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { DEMO_CITIES } from "@/lib/scientific/types";
import { toast } from "@/hooks/use-toast";
import type { StrategyComparison } from "@/lib/scientific/types";

export function StrategyComparisonSection() {
  const config = useAppStore((s) => s.config);
  const weights = useAppStore((s) => s.weights);
  const minCoherence = useAppStore((s) => s.minCoherence);

  const [cityId, setCityId] = useState("phoenix");
  const [hours, setHours] = useState(12);
  const [lookAhead, setLookAhead] = useState(2);
  const [running, setRunning] = useState(false);
  const [comparison, setComparison] = useState<StrategyComparison | null>(null);

  async function runComparison() {
    setRunning(true);
    try {
      const res = await fetch("/api/strategies/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cityId,
          hours,
          config,
          weights,
          minCoherence,
          useForecast: true,
          lookAheadHours: lookAhead,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast({
          title: "Strategy comparison failed",
          description: data.error,
          variant: "destructive",
        });
        return;
      }
      setComparison(data);
      toast({
        title: "Strategy comparison complete",
        description: `Predictive saves ${data.savings.predictiveVsFixed.toFixed(1)}% vs fixed, ${data.savings.predictiveVsReactive.toFixed(1)}% vs reactive.`,
      });
    } catch (err: any) {
      toast({
        title: "Strategy comparison error",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  }

  const city = DEMO_CITIES.find((c) => c.id === cityId);

  return (
    <div className="space-y-4">
      {/* Header banner — explains the novel contribution */}
      <Card className="border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-purple-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Trophy className="w-5 h-5 text-cyan-300 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium mb-1">
                Predictive Quantum Thermal Optimization
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                The centerpiece research contribution: compare three cooling
                strategies over a forecast window. The Predictive strategy uses
                FortyGuard&apos;s 12-hour forecast to pre-position the operating
                point before thermal stress arrives — achieving the lowest
                modeled energy while respecting the coherence constraint.
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                <Badge variant="outline" className="text-[10px]">
                  Strategy A: Fixed (baseline)
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  Strategy B: Reactive
                </Badge>
                <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/30 text-[10px]">
                  Strategy C: Predictive ⭐
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card className="border-border bg-card/60">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Demo City (US only)</Label>
              <Select value={cityId} onValueChange={setCityId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEMO_CITIES.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name}, {c.state} — {c.climate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-[10px] text-muted-foreground">
                {city?.rationale}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Forecast Window: <span className="font-mono">{hours}h</span>
              </Label>
              <Slider
                value={[hours]}
                min={4}
                max={12}
                step={1}
                onValueChange={(v) => setHours(v[0])}
              />
              <div className="text-[10px] text-muted-foreground">
                FortyGuard supports up to 12h forecast
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Predictive Look-ahead: <span className="font-mono">{lookAhead}h</span>
              </Label>
              <Slider
                value={[lookAhead]}
                min={1}
                max={6}
                step={1}
                onValueChange={(v) => setLookAhead(v[0])}
              />
              <div className="text-[10px] text-muted-foreground">
                How far ahead the predictive strategy looks
              </div>
            </div>
          </div>
          <Button className="w-full" onClick={runComparison} disabled={running}>
            <Play className={`w-4 h-4 mr-2 ${running ? "animate-pulse" : ""}`} />
            {running ? "Running 3 strategies..." : "Run Strategy Comparison"}
          </Button>
          {comparison && (
            <div className="text-[10px] text-muted-foreground">
              Forecast source:{" "}
              <Badge
                variant="outline"
                className={
                  comparison.forecastWindow.source === "fortyguard"
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]"
                    : "bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px]"
                }
              >
                {comparison.forecastWindow.source}
              </Badge>{" "}
              · {comparison.forecastWindow.hours}h window ·{" "}
              {comparison.city?.name}, {comparison.city?.state}
            </div>
          )}
        </CardContent>
      </Card>

      {!comparison && (
        <Card className="border-border bg-card/60">
          <CardContent className="p-8 text-center">
            <Sparkles className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <div className="text-sm font-medium">No comparison run yet</div>
            <div className="text-xs text-muted-foreground mt-1">
              Click &quot;Run Strategy Comparison&quot; to evaluate all three
              strategies over the forecast window.
            </div>
          </CardContent>
        </Card>
      )}

      {comparison && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StrategyKpi
              label="Strategy A — Fixed"
              totalEnergy={comparison.fixed.totalEnergyKWh}
              minCoherence={comparison.fixed.minCoherence}
              violations={comparison.fixed.constraintViolations}
              color="oklch(0.68 0.22 350)"
              accent="pink"
            />
            <StrategyKpi
              label="Strategy B — Reactive"
              totalEnergy={comparison.reactive.totalEnergyKWh}
              minCoherence={comparison.reactive.minCoherence}
              violations={comparison.reactive.constraintViolations}
              color="oklch(0.72 0.20 30)"
              accent="orange"
              savings={comparison.savings.reactiveVsFixed}
            />
            <StrategyKpi
              label="Strategy C — Predictive ⭐"
              totalEnergy={comparison.predictive.totalEnergyKWh}
              minCoherence={comparison.predictive.minCoherence}
              violations={comparison.predictive.constraintViolations}
              color="oklch(0.78 0.15 200)"
              accent="cyan"
              savings={comparison.savings.predictiveVsFixed}
              highlight
            />
          </div>

          {/* Total energy comparison */}
          <Card className="border-border bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Total Modeled Energy Comparison
                <span className="ml-auto text-xs text-muted-foreground font-normal">
                  over {comparison.forecastWindow.hours}h window
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={[
                    { name: "Fixed", energy: comparison.fixed.totalEnergyKWh, color: "oklch(0.68 0.22 350)" },
                    { name: "Reactive", energy: comparison.reactive.totalEnergyKWh, color: "oklch(0.72 0.20 30)" },
                    { name: "Predictive ⭐", energy: comparison.predictive.totalEnergyKWh, color: "oklch(0.78 0.15 200)" },
                  ]}
                  margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 240)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "oklch(0.68 0.02 240)" }} stroke="oklch(0.28 0.02 240)" />
                  <YAxis tick={{ fontSize: 10, fill: "oklch(0.68 0.02 240)" }} stroke="oklch(0.28 0.02 240)" label={{ value: "Energy (kWh)", angle: -90, position: "insideLeft", offset: 8, style: { fill: "oklch(0.68 0.02 240)", fontSize: 11 } }} />
                  <Tooltip contentStyle={{ background: "oklch(0.18 0.025 240)", border: "1px solid oklch(0.28 0.02 240)", borderRadius: "8px", fontSize: "11px" }} formatter={(v: number) => [`${v.toFixed(2)} kWh`, "Energy"]} />
                  <Bar dataKey="energy" radius={[6, 6, 0, 0]}>
                    {[0, 1, 2].map((i) => (
                      <Cell key={i} fill={["oklch(0.68 0.22 350)", "oklch(0.72 0.20 30)", "oklch(0.78 0.15 200)"][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Hour-by-hour operating temperatures */}
          <Card className="border-border bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Hour-by-Hour Operating Temperature
                <span className="ml-auto text-xs text-muted-foreground font-normal">
                  how each strategy adapts
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={comparison.fixed.steps.map((_, i) => ({
                    hour: i,
                    ambient: comparison.fixed.steps[i].ambientC,
                    fixed: comparison.fixed.steps[i].selectedTempMK,
                    reactive: comparison.reactive.steps[i].selectedTempMK,
                    predictive: comparison.predictive.steps[i].selectedTempMK,
                  }))}
                  margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 240)" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "oklch(0.68 0.02 240)" }} stroke="oklch(0.28 0.02 240)" label={{ value: "Hour", position: "bottom", offset: 4, style: { fill: "oklch(0.68 0.02 240)", fontSize: 11 } }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "oklch(0.78 0.15 200)" }} stroke="oklch(0.28 0.02 240)" label={{ value: "Operating T (mK)", angle: -90, position: "insideLeft", offset: 8, style: { fill: "oklch(0.78 0.15 200)", fontSize: 11 } }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "oklch(0.72 0.20 30)" }} stroke="oklch(0.28 0.02 240)" label={{ value: "Ambient (°C)", angle: 90, position: "insideRight", offset: 8, style: { fill: "oklch(0.72 0.20 30)", fontSize: 11 } }} />
                  <Tooltip contentStyle={{ background: "oklch(0.18 0.025 240)", border: "1px solid oklch(0.28 0.02 240)", borderRadius: "8px", fontSize: "11px" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line yAxisId="left" type="monotone" dataKey="fixed" stroke="oklch(0.68 0.22 350)" strokeWidth={2} dot={{ r: 2 }} name="Fixed" />
                  <Line yAxisId="left" type="monotone" dataKey="reactive" stroke="oklch(0.72 0.20 30)" strokeWidth={2} dot={{ r: 2 }} name="Reactive" />
                  <Line yAxisId="left" type="monotone" dataKey="predictive" stroke="oklch(0.78 0.15 200)" strokeWidth={2.5} dot={{ r: 3 }} name="Predictive" />
                  <Line yAxisId="right" type="monotone" dataKey="ambient" stroke="oklch(0.5 0.05 240)" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Ambient" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Hour-by-hour coherence */}
          <Card className="border-border bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Hour-by-Hour Coherence
                <span className="ml-auto text-xs text-muted-foreground font-normal">
                  constraint at {minCoherence.toFixed(2)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={comparison.fixed.steps.map((_, i) => ({
                    hour: i,
                    fixed: comparison.fixed.steps[i].coherence * 100,
                    reactive: comparison.reactive.steps[i].coherence * 100,
                    predictive: comparison.predictive.steps[i].coherence * 100,
                  }))}
                  margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 240)" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "oklch(0.68 0.02 240)" }} stroke="oklch(0.28 0.02 240)" label={{ value: "Hour", position: "bottom", offset: 4, style: { fill: "oklch(0.68 0.02 240)", fontSize: 11 } }} />
                  <YAxis tick={{ fontSize: 10, fill: "oklch(0.68 0.02 240)" }} stroke="oklch(0.28 0.02 240)" domain={[0, 100]} label={{ value: "Coherence (%)", angle: -90, position: "insideLeft", offset: 8, style: { fill: "oklch(0.68 0.02 240)", fontSize: 11 } }} />
                  <Tooltip contentStyle={{ background: "oklch(0.18 0.025 240)", border: "1px solid oklch(0.28 0.02 240)", borderRadius: "8px", fontSize: "11px" }} formatter={(v: number) => `${v.toFixed(2)}%`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={minCoherence * 100} stroke="oklch(0.65 0.22 25)" strokeDasharray="4 4" label={{ value: `Min ${minCoherence * 100}%`, position: "right", style: { fill: "oklch(0.65 0.22 25)", fontSize: 10 } }} />
                  <Line type="monotone" dataKey="fixed" stroke="oklch(0.68 0.22 350)" strokeWidth={2} dot={{ r: 2 }} name="Fixed" />
                  <Line type="monotone" dataKey="reactive" stroke="oklch(0.72 0.20 30)" strokeWidth={2} dot={{ r: 2 }} name="Reactive" />
                  <Line type="monotone" dataKey="predictive" stroke="oklch(0.78 0.15 200)" strokeWidth={2.5} dot={{ r: 3 }} name="Predictive" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Savings summary */}
          <Card className="border-cyan-500/30 bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-emerald-300" />
                Modeled Energy Savings Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <SavingsCard
                  label="Reactive vs Fixed"
                  value={comparison.savings.reactiveVsFixed}
                />
                <SavingsCard
                  label="Predictive vs Fixed"
                  value={comparison.savings.predictiveVsFixed}
                />
                <SavingsCard
                  label="Predictive vs Reactive"
                  value={comparison.savings.predictiveVsReactive}
                  highlight
                />
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <MetricRow
                  label="Constraint Violations"
                  fixed={comparison.fixed.constraintViolations}
                  reactive={comparison.reactive.constraintViolations}
                  predictive={comparison.predictive.constraintViolations}
                />
                <MetricRow
                  label="Min Coherence"
                  fixed={comparison.fixed.minCoherence * 100}
                  reactive={comparison.reactive.minCoherence * 100}
                  predictive={comparison.predictive.minCoherence * 100}
                  suffix="%"
                  precision={1}
                />
                <MetricRow
                  label="Mean Coherence"
                  fixed={comparison.fixed.meanCoherence * 100}
                  reactive={comparison.reactive.meanCoherence * 100}
                  predictive={comparison.predictive.meanCoherence * 100}
                  suffix="%"
                  precision={1}
                />
                <MetricRow
                  label="Total Energy"
                  fixed={comparison.fixed.totalEnergyKWh}
                  reactive={comparison.reactive.totalEnergyKWh}
                  predictive={comparison.predictive.totalEnergyKWh}
                  suffix=" kWh"
                  precision={2}
                />
              </div>
              <div className="mt-4 text-[10px] text-muted-foreground leading-relaxed">
                <Clock className="w-3 h-3 inline mr-1" />
                All values are <strong>SIMULATION / RESEARCH APPROXIMATION</strong>.
                Forecast source: {comparison.forecastWindow.source}. The
                Predictive strategy uses a {lookAhead}-hour look-ahead window
                to pre-position the operating point before thermal stress arrives.
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StrategyKpi({
  label,
  totalEnergy,
  minCoherence,
  violations,
  color,
  accent,
  savings,
  highlight,
}: {
  label: string;
  totalEnergy: number;
  minCoherence: number;
  violations: number;
  color: string;
  accent: "cyan" | "orange" | "pink";
  savings?: number;
  highlight?: boolean;
}) {
  const accentClass: Record<string, string> = {
    cyan: "text-cyan-300",
    orange: "text-orange-300",
    pink: "text-pink-300",
  };
  return (
    <Card className={`stat-card ${highlight ? "border-cyan-500/40" : ""}`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="data-label">{label}</span>
          <Zap className={`w-3.5 h-3.5 ${accentClass[accent]}`} />
        </div>
        <div className="data-value">{totalEnergy.toFixed(1)} kWh</div>
        <div className="mt-2 flex items-center gap-2 text-[10px]">
          <span className="text-muted-foreground">Min C: {(minCoherence * 100).toFixed(1)}%</span>
          <span className={violations === 0 ? "text-emerald-300" : "text-rose-300"}>
            {violations} violations
          </span>
          {savings !== undefined && (
            <span className="ml-auto text-emerald-300 font-mono">
              -{savings.toFixed(1)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SavingsCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-lg border ${
        highlight
          ? "border-cyan-500/30 bg-cyan-500/5"
          : "border-border bg-muted/30"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`text-xl font-semibold ${value > 0 ? "text-emerald-300" : "text-rose-300"}`}>
        {value > 0 ? "−" : "+"}{Math.abs(value).toFixed(1)}%
      </div>
      <div className="text-[10px] text-muted-foreground">modeled energy</div>
    </div>
  );
}

function MetricRow({
  label,
  fixed,
  reactive,
  predictive,
  suffix = "",
  precision = 0,
}: {
  label: string;
  fixed: number;
  reactive: number;
  predictive: number;
  suffix?: string;
  precision?: number;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </div>
      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Fixed</span>
          <span className="font-mono">{fixed.toFixed(precision)}{suffix}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Reactive</span>
          <span className="font-mono">{reactive.toFixed(precision)}{suffix}</span>
        </div>
        <div className="flex justify-between text-cyan-300">
          <span>Predictive</span>
          <span className="font-mono">{predictive.toFixed(precision)}{suffix}</span>
        </div>
      </div>
    </div>
  );
}

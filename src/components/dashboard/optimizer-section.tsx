"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Play,
  Save,
  Zap,
  Target,
  TrendingUp,
  AlertTriangle,
  Snowflake,
  Gauge,
} from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { ParetoChart } from "@/components/charts/pareto-chart";
import { TempCoherenceChart } from "@/components/charts/temp-coherence-chart";
import { toast } from "@/hooks/use-toast";
import { SCENARIOS } from "@/lib/scientific/types";

export function OptimizerSection() {
  const config = useAppStore((s) => s.config);
  const weights = useAppStore((s) => s.weights);
  const setWeights = useAppStore((s) => s.setWeights);
  const minCoherence = useAppStore((s) => s.minCoherence);
  const setMinCoherence = useAppStore((s) => s.setMinCoherence);
  const ambientC = useAppStore((s) => s.ambientC);
  const scenario = useAppStore((s) => s.scenario);
  const optimization = useAppStore((s) => s.optimization);
  const setOptimization = useAppStore((s) => s.setOptimization);
  const setLastExperimentId = useAppStore((s) => s.setLastExperimentId);

  const [running, setRunning] = useState(false);
  const [persistExperiment, setPersistExperiment] = useState(true);
  const [experimentName, setExperimentName] = useState("");

  async function runOptimization() {
    setRunning(true);
    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          ambientC,
          weights,
          minCoherence,
          persist: persistExperiment,
          experimentName:
            experimentName ||
            `${config.name} · ${scenario} · ${new Date().toLocaleString()}`,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast({ title: "Optimization failed", description: data.error, variant: "destructive" });
        return;
      }
      setOptimization(data);
      if (data.experimentId) setLastExperimentId(data.experimentId);
      toast({
        title: data.noFeasibleSolution ? "No feasible solution" : "Optimization complete",
        description: data.message,
        variant: data.noFeasibleSolution ? "destructive" : "default",
      });
    } catch (err: any) {
      toast({
        title: "Optimization error",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  }

  const totalWeight = weights.coherence + weights.energy;
  const normCoh = (weights.coherence / totalWeight) * 100;
  const normEng = (weights.energy / totalWeight) * 100;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Controls */}
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Optimization Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Coherence Weight</Label>
                <span className="text-xs font-mono">{normCoh.toFixed(0)}%</span>
              </div>
              <Slider
                value={[weights.coherence * 100]}
                min={0}
                max={100}
                step={5}
                onValueChange={(v) =>
                  setWeights({
                    coherence: v[0] / 100,
                    energy: 1 - v[0] / 100,
                  })
                }
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Energy Weight</Label>
                <span className="text-xs font-mono">{normEng.toFixed(0)}%</span>
              </div>
              <Slider
                value={[weights.energy * 100]}
                min={0}
                max={100}
                step={5}
                onValueChange={(v) =>
                  setWeights({
                    coherence: 1 - v[0] / 100,
                    energy: v[0] / 100,
                  })
                }
              />
            </div>
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Min Coherence Threshold</Label>
                <span className="text-xs font-mono">
                  {(minCoherence * 100).toFixed(0)}%
                </span>
              </div>
              <Slider
                value={[minCoherence * 100]}
                min={40}
                max={95}
                step={1}
                onValueChange={(v) => setMinCoherence(v[0] / 100)}
              />
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label className="text-xs">Experiment Name (optional)</Label>
              <Input
                value={experimentName}
                onChange={(e) => setExperimentName(e.target.value)}
                placeholder="auto-generated"
                className="h-9 text-sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Persist as experiment</Label>
              <Switch checked={persistExperiment} onCheckedChange={setPersistExperiment} />
            </div>
            <Button
              className="w-full"
              onClick={runOptimization}
              disabled={running}
            >
              <Play className={`w-4 h-4 mr-2 ${running ? "animate-pulse" : ""}`} />
              {running ? "Optimizing..." : "Run Optimizer"}
            </Button>
            <div className="text-[10px] text-muted-foreground leading-relaxed">
              Approach A: constrained optimization (feasibility filter).<br />
              Approach B: weighted objective — minimize{" "}
              <span className="font-mono">w<sub>c</sub>·(1−C) + w<sub>e</sub>·E<sub>norm</sub></span>.
            </div>
          </CardContent>
        </Card>

        {/* Pareto Chart */}
        <Card className="lg:col-span-3 border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Pareto Frontier — Coherence vs Cooling Energy
              <span className="ml-auto text-xs text-muted-foreground font-normal">
                trade-off visualization
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ParetoChart height={360} />
          </CardContent>
        </Card>
      </div>

      {/* Result KPIs */}
      {optimization && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <ResultKpi
            label="Recommended Temp"
            value={optimization.optimal ? `${optimization.optimal.temperatureMK.toFixed(0)} mK` : "—"}
            icon={Snowflake}
            accent="cyan"
          />
          <ResultKpi
            label="Coherence"
            value={optimization.optimal ? `${(optimization.optimal.coherenceScore * 100).toFixed(1)}%` : "—"}
            icon={Target}
            accent="green"
          />
          <ResultKpi
            label="Modeled Energy"
            value={optimization.optimal ? `${optimization.optimal.energyConsumptionKWh.toFixed(2)} kWh` : "—"}
            icon={Zap}
            accent="orange"
          />
          <ResultKpi
            label="Baseline Energy"
            value={`${optimization.baseline.energyKWh.toFixed(2)} kWh`}
            icon={Gauge}
            accent="pink"
          />
          <ResultKpi
            label="Energy Savings"
            value={`${optimization.metrics.energySavingPercent.toFixed(1)}%`}
            icon={TrendingUp}
            accent="green"
          />
          <ResultKpi
            label="Risk Level"
            value={optimization.optimal?.decoherenceRisk ?? "—"}
            icon={AlertTriangle}
            accent="cyan"
          />
        </div>
      )}

      {/* Temperature sweep chart */}
      <Card className="border-border bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Temperature Sweep — Coherence & Energy
            <span className="ml-auto text-xs text-muted-foreground font-normal">
              {optimization?.sweep.length ?? 0} candidate temperatures
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TempCoherenceChart height={280} />
        </CardContent>
      </Card>

      {/* Sweep table */}
      {optimization && (
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Candidate Sweep</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[320px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium text-muted-foreground">Temp (mK)</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">Coherence</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">T1 (µs)</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">T2 (µs)</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">Energy (kWh)</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">Objective</th>
                    <th className="text-center p-2 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {optimization.sweep.map((p) => {
                    const isOptimal = optimization.optimal?.temperatureMK === p.temperatureMK;
                    const isPareto = optimization.pareto.some((q) => q.temperatureMK === p.temperatureMK);
                    return (
                      <tr
                        key={p.temperatureMK}
                        className={`border-t border-border/50 ${
                          isOptimal ? "bg-cyan-500/10" : isPareto ? "bg-purple-500/5" : ""
                        }`}
                      >
                        <td className="p-2 font-mono">{p.temperatureMK.toFixed(0)}</td>
                        <td className="p-2 text-right font-mono">{(p.coherenceScore * 100).toFixed(1)}%</td>
                        <td className="p-2 text-right font-mono">{p.T1Microseconds.toFixed(1)}</td>
                        <td className="p-2 text-right font-mono">{p.T2Microseconds.toFixed(1)}</td>
                        <td className="p-2 text-right font-mono">{p.energyConsumptionKWh.toFixed(2)}</td>
                        <td className="p-2 text-right font-mono">{p.objectiveScore.toFixed(3)}</td>
                        <td className="p-2 text-center">
                          {isOptimal ? (
                            <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px]">OPTIMAL</Badge>
                          ) : isPareto ? (
                            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px]">PARETO</Badge>
                          ) : p.feasible ? (
                            <Badge variant="outline" className="text-[10px]">feasible</Badge>
                          ) : (
                            <Badge className="bg-rose-500/15 text-rose-300 border-rose-500/30 text-[10px]">infeasible</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ResultKpi({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  accent: "cyan" | "green" | "orange" | "pink";
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
          <Icon className={`w-3.5 h-3.5 ${accentClass[accent]}`} />
        </div>
        <div className="data-value">{value}</div>
      </CardContent>
    </Card>
  );
}

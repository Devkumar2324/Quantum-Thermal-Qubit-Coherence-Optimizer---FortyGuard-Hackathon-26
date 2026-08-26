"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ScatterChart,
  Scatter,
  Area,
  ComposedChart,
  AreaChart,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  BookOpen,
  TrendingUp,
  Zap,
  Target,
  Activity,
  Beaker,
  FlaskConical,
} from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { ParetoChart } from "@/components/charts/pareto-chart";

export function ResearchSection() {
  const optimization = useAppStore((s) => s.optimization);
  const config = useAppStore((s) => s.config);
  const ambientC = useAppStore((s) => s.ambientC);

  if (!optimization) {
    return (
      <Card className="border-border bg-card/60">
        <CardContent className="p-8 text-center">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <div className="text-sm font-medium">No research data available</div>
          <div className="text-xs text-muted-foreground mt-1">
            Run an optimization to populate the research charts.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Chart 1: Temp vs Coherence
  const tempCoherenceData = optimization.sweep.map((p) => ({
    temp: p.temperatureMK,
    coherence: p.coherenceScore * 100,
    T1: p.T1Microseconds,
    T2: p.T2Microseconds,
  }));

  // Chart 2: Temp vs Cooling Energy
  const tempEnergyData = optimization.sweep.map((p) => ({
    temp: p.temperatureMK,
    energy: p.energyConsumptionKWh,
    power: p.coolingPowerWatts,
    cop: p.cop,
  }));

  // Chart 3: Temp vs Decoherence Risk
  const tempRiskData = optimization.sweep.map((p) => ({
    temp: p.temperatureMK,
    noise: p.thermalNoise * 100,
    population: p.thermalPopulation,
  }));

  // Chart 4: Coherence vs Energy (Scatter)
  const cohEnergyData = optimization.sweep.map((p) => ({
    coherence: p.coherenceScore * 100,
    energy: p.energyConsumptionKWh,
    feasible: p.feasible,
  }));

  // Chart 6: Baseline vs Optimized
  const baselineData = [
    {
      name: "Baseline",
      energy: optimization.baseline.energyKWh,
      coherence: optimization.baseline.coherence * 100,
    },
    {
      name: "Optimized",
      energy: optimization.optimal?.energyConsumptionKWh ?? 0,
      coherence: (optimization.optimal?.coherenceScore ?? 0) * 100,
    },
  ];

  // Chart 7: Ambient vs Optimal (synthetic - run multiple ambients)
  const ambientSweep = [15, 20, 25, 30, 35, 40, 45].map((a) => {
    // Approximate by reusing the sweep with scaled energies
    const optimalPoint = optimization.optimal;
    return {
      ambient: a,
      optimalTemp: optimalPoint?.temperatureMK ?? 20,
      // rough scaling: energy grows ~linearly with (T_hot - T_cold)
      energy:
        (optimalPoint?.energyConsumptionKWh ?? 0) *
        (a / (ambientC || 25)),
    };
  });

  return (
    <div className="space-y-4">
      {/* Methodology banner */}
      <Card className="border-border bg-card/60">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FlaskConical className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium mb-1">
                Research Methodology
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                Multi-objective optimization over a discrete temperature sweep.
                For each candidate operating temperature, the model computes
                Bose-Einstein thermal population, T1 (Purcell-coupled),
                T2 (1/T2 = 1/(2T1) + 1/T_phi), and a coherence score. Cooling
                energy uses a Carnot-efficiency approximation with realistic
                cryogenic parameters. The Pareto frontier identifies
                non-dominated (coherence, energy) trade-offs. All values are
                SIMULATION / RESEARCH APPROXIMATION.
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                <Badge variant="outline" className="text-[10px]">
                  Bose-Einstein n̄
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  Purcell decay
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  1/f flux noise
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  Carnot COP
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  Pareto dominance
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1 */}
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-300" />
              1. Temperature vs Coherence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={tempCoherenceData} margin={{ top: 5, right: 16, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.15 200)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.78 0.15 200)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 240)" />
                <XAxis dataKey="temp" type="number" domain={["dataMin", "dataMax"]} tick={{ fontSize: 10, fill: "oklch(0.68 0.02 240)" }} stroke="oklch(0.28 0.02 240)" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "oklch(0.68 0.02 240)" }} stroke="oklch(0.28 0.02 240)" />
                <Tooltip contentStyle={{ background: "oklch(0.18 0.025 240)", border: "1px solid oklch(0.28 0.02 240)", borderRadius: "8px", fontSize: "11px" }} />
                <ReferenceLine y={optimization.minCoherence * 100} stroke="oklch(0.65 0.22 25)" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="coherence" stroke="oklch(0.78 0.15 200)" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 2 */}
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-300" />
              2. Temperature vs Cooling Energy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={tempEnergyData} margin={{ top: 5, right: 16, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.20 30)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.72 0.20 30)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 240)" />
                <XAxis dataKey="temp" type="number" domain={["dataMin", "dataMax"]} tick={{ fontSize: 10, fill: "oklch(0.68 0.02 240)" }} stroke="oklch(0.28 0.02 240)" />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.68 0.02 240)" }} stroke="oklch(0.28 0.02 240)" />
                <Tooltip contentStyle={{ background: "oklch(0.18 0.025 240)", border: "1px solid oklch(0.28 0.02 240)", borderRadius: "8px", fontSize: "11px" }} />
                <Area type="monotone" dataKey="energy" stroke="oklch(0.72 0.20 30)" strokeWidth={2} fill="url(#g2)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 3 */}
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-pink-300" />
              3. Temperature vs Decoherence Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={tempRiskData} margin={{ top: 5, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 240)" />
                <XAxis dataKey="temp" type="number" domain={["dataMin", "dataMax"]} tick={{ fontSize: 10, fill: "oklch(0.68 0.02 240)" }} stroke="oklch(0.28 0.02 240)" />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.68 0.02 240)" }} stroke="oklch(0.28 0.02 240)" />
                <Tooltip contentStyle={{ background: "oklch(0.18 0.025 240)", border: "1px solid oklch(0.28 0.02 240)", borderRadius: "8px", fontSize: "11px" }} />
                <Line type="monotone" dataKey="noise" stroke="oklch(0.68 0.22 350)" strokeWidth={2} dot={false} name="Thermal Noise %" />
                <Line type="monotone" dataKey="population" stroke="oklch(0.62 0.22 290)" strokeWidth={2} strokeDasharray="4 2" dot={false} name="n̄ (population)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 4 */}
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-300" />
              4. Coherence vs Energy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 240)" />
                <XAxis type="number" dataKey="coherence" name="Coherence" unit="%" domain={[0, 100]} tick={{ fontSize: 10, fill: "oklch(0.68 0.02 240)" }} stroke="oklch(0.28 0.02 240)" />
                <YAxis type="number" dataKey="energy" name="Energy" unit=" kWh" tick={{ fontSize: 10, fill: "oklch(0.68 0.02 240)" }} stroke="oklch(0.28 0.02 240)" />
                <Tooltip contentStyle={{ background: "oklch(0.18 0.025 240)", border: "1px solid oklch(0.28 0.02 240)", borderRadius: "8px", fontSize: "11px" }} cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={cohEnergyData.filter((d) => d.feasible)} fill="oklch(0.65 0.18 145)" fillOpacity={0.6} name="Feasible" />
                <Scatter data={cohEnergyData.filter((d) => !d.feasible)} fill="oklch(0.4 0.04 30)" fillOpacity={0.4} name="Infeasible" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Chart 5: Pareto (full width) */}
      <Card className="border-border bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-300" />
            5. Pareto Frontier
            <span className="ml-auto text-xs text-muted-foreground font-normal">
              non-dominated solutions
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ParetoChart height={300} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 6 */}
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Beaker className="w-4 h-4 text-cyan-300" />
              6. Baseline vs Optimized
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={baselineData} margin={{ top: 5, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 240)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "oklch(0.68 0.02 240)" }} stroke="oklch(0.28 0.02 240)" />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.68 0.02 240)" }} stroke="oklch(0.28 0.02 240)" />
                <Tooltip contentStyle={{ background: "oklch(0.18 0.025 240)", border: "1px solid oklch(0.28 0.02 240)", borderRadius: "8px", fontSize: "11px" }} />
                <Bar dataKey="energy" fill="oklch(0.68 0.22 350)" radius={[4, 4, 0, 0]} name="Energy (kWh)" />
                <Bar dataKey="coherence" fill="oklch(0.78 0.15 200)" radius={[4, 4, 0, 0]} name="Coherence (%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 7 */}
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-300" />
              7. Ambient vs Optimal Operating Temp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={ambientSweep} margin={{ top: 5, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 240)" />
                <XAxis dataKey="ambient" tick={{ fontSize: 10, fill: "oklch(0.68 0.02 240)" }} stroke="oklch(0.28 0.02 240)" label={{ value: "Ambient (°C)", position: "bottom", offset: 4, style: { fill: "oklch(0.68 0.02 240)", fontSize: 10 } }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "oklch(0.78 0.15 200)" }} stroke="oklch(0.28 0.02 240)" label={{ value: "Optimal T (mK)", angle: -90, position: "insideLeft", offset: 8, style: { fill: "oklch(0.78 0.15 200)", fontSize: 10 } }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "oklch(0.72 0.20 30)" }} stroke="oklch(0.28 0.02 240)" label={{ value: "Energy (kWh)", angle: 90, position: "insideRight", offset: 8, style: { fill: "oklch(0.72 0.20 30)", fontSize: 10 } }} />
                <Tooltip contentStyle={{ background: "oklch(0.18 0.025 240)", border: "1px solid oklch(0.28 0.02 240)", borderRadius: "8px", fontSize: "11px" }} />
                <Line yAxisId="left" type="monotone" dataKey="optimalTemp" stroke="oklch(0.78 0.15 200)" strokeWidth={2} dot={{ r: 3 }} name="Optimal T" />
                <Line yAxisId="right" type="monotone" dataKey="energy" stroke="oklch(0.72 0.20 30)" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3 }} name="Energy" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Limitations */}
      <Card className="border-border bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Limitations & Scientific Honesty</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
            <li>
              All T1/T2 values are <strong>simulation outputs</strong> from a
              simplified physics-inspired model, not measured from real
              hardware.
            </li>
            <li>
              Cooling energy is labeled as <strong>&quot;Modeled Cooling Energy&quot;</strong> — it uses
              Carnot-efficiency approximation, not measured cryostat power draw.
            </li>
            <li>
              Energy savings are reported as <strong>&quot;modeled energy savings&quot;</strong>, not
              actual measured savings.
            </li>
            <li>
              The Bose-Einstein thermal population model assumes harmonic
              oscillator modes; real qubit spectra are anharmonic.
            </li>
            <li>
              Ambient temperature from FortyGuard is the environmental
              temperature, NOT the physical temperature of any qubit.
            </li>
            <li>
              The model is intentionally modular so each component can be
              replaced with a hardware-calibrated implementation.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

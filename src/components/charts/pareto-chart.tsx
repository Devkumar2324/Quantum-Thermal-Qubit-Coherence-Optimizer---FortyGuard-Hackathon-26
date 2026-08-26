"use client";

import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  LabelList,
  Cell,
} from "recharts";
import { useAppStore } from "@/lib/store/app-store";
import { useMemo } from "react";

interface Props {
  height?: number;
}

export function ParetoChart({ height = 320 }: Props) {
  const optimization = useAppStore((s) => s.optimization);

  const data = useMemo(() => {
    if (!optimization) return [];
    return optimization.sweep.map((p) => ({
      energy: p.energyConsumptionKWh,
      coherence: p.coherenceScore * 100,
      temp: p.temperatureMK,
      feasible: p.feasible,
      pareto: optimization.pareto.some((q) => q.temperatureMK === p.temperatureMK),
      optimal: optimization.optimal?.temperatureMK === p.temperatureMK,
    }));
  }, [optimization]);

  const paretoData = data.filter((d) => d.pareto);
  const feasibleData = data.filter((d) => d.feasible && !d.pareto);
  const infeasibleData = data.filter((d) => !d.feasible);
  const optimalData = data.filter((d) => d.optimal);

  const minCoherence = (optimization?.minCoherence ?? 0.85) * 100;

  if (!optimization) {
    return (
      <div
        className="flex items-center justify-center text-xs text-muted-foreground"
        style={{ height }}
      >
        Run the optimizer to see the Pareto frontier.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 10, right: 16, left: -10, bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 240)" />
        <XAxis
          type="number"
          dataKey="energy"
          name="Cooling Energy"
          unit=" kWh"
          tick={{ fontSize: 10, fill: "oklch(0.68 0.02 240)" }}
          stroke="oklch(0.28 0.02 240)"
          label={{
            value: "Cooling Energy (kWh/day)",
            position: "bottom",
            offset: 4,
            style: { fill: "oklch(0.68 0.02 240)", fontSize: 11 },
          }}
        />
        <YAxis
          type="number"
          dataKey="coherence"
          name="Coherence"
          unit="%"
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: "oklch(0.68 0.02 240)" }}
          stroke="oklch(0.28 0.02 240)"
          label={{
            value: "Qubit Coherence (%)",
            angle: -90,
            position: "insideLeft",
            offset: 8,
            style: { fill: "oklch(0.68 0.02 240)", fontSize: 11 },
          }}
        />
        <Tooltip
          contentStyle={{
            background: "oklch(0.18 0.025 240)",
            border: "1px solid oklch(0.28 0.02 240)",
            borderRadius: "8px",
            fontSize: "11px",
          }}
          cursor={{ strokeDasharray: "3 3" }}
          formatter={(value: number, name: string) => [
            name === "coherence" ? `${value.toFixed(2)}%` : `${value.toFixed(2)} kWh`,
            name === "coherence" ? "Coherence" : "Energy",
          ]}
          labelFormatter={() => ""}
        />
        <ReferenceLine
          y={minCoherence}
          stroke="oklch(0.65 0.22 25)"
          strokeDasharray="4 4"
          label={{
            value: `Min coherence ${minCoherence.toFixed(0)}%`,
            position: "right",
            style: { fill: "oklch(0.65 0.22 25)", fontSize: 10 },
          }}
        />
        {/* Infeasible */}
        <Scatter
          name="Infeasible"
          data={infeasibleData}
          fill="oklch(0.4 0.04 30)"
          fillOpacity={0.4}
        />
        {/* Feasible (non-pareto) */}
        <Scatter
          name="Feasible"
          data={feasibleData}
          fill="oklch(0.65 0.18 145)"
          fillOpacity={0.5}
        />
        {/* Pareto frontier */}
        <Scatter
          name="Pareto Frontier"
          data={paretoData}
          fill="oklch(0.62 0.22 290)"
          fillOpacity={0.85}
          line
          lineType="joint"
          shape="diamond"
        />
        {/* Optimal point */}
        <Scatter
          name="Optimal"
          data={optimalData}
          fill="oklch(0.78 0.15 200)"
          shape="star"
          size={120}
        >
          {optimalData.map((d, i) => (
            <Cell key={i} fill="oklch(0.78 0.15 200)" />
          ))}
          <LabelList
            dataKey="temp"
            position="top"
            formatter={(v: number) => `${v.toFixed(0)} mK`}
            style={{ fill: "oklch(0.78 0.15 200)", fontSize: 11, fontWeight: 600 }}
          />
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

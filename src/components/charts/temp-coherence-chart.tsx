"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import { useAppStore } from "@/lib/store/app-store";
import { useMemo } from "react";

interface Props {
  height?: number;
}

export function TempCoherenceChart({ height = 220 }: Props) {
  const optimization = useAppStore((s) => s.optimization);

  const data = useMemo(() => {
    if (!optimization) return [];
    return optimization.sweep.map((p) => ({
      temp: p.temperatureMK,
      coherence: p.coherenceScore * 100,
      energy: p.energyConsumptionKWh,
      feasible: p.feasible,
    }));
  }, [optimization]);

  if (!optimization) {
    return (
      <div
        className="flex items-center justify-center text-xs text-muted-foreground"
        style={{ height }}
      >
        Run the optimizer to see temperature sweep results.
      </div>
    );
  }

  const minCoherence = optimization.minCoherence * 100;
  const optimalTemp = optimization.optimal?.temperatureMK;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 16, left: -10, bottom: 16 }}>
        <defs>
          <linearGradient id="cohGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.78 0.15 200)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="oklch(0.78 0.15 200)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.72 0.20 30)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="oklch(0.72 0.20 30)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 240)" />
        <XAxis
          dataKey="temp"
          type="number"
          domain={["dataMin", "dataMax"]}
          tick={{ fontSize: 10, fill: "oklch(0.68 0.02 240)" }}
          stroke="oklch(0.28 0.02 240)"
          label={{
            value: "Operating Temperature (mK)",
            position: "bottom",
            offset: 4,
            style: { fill: "oklch(0.68 0.02 240)", fontSize: 11 },
          }}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 10, fill: "oklch(0.68 0.02 240)" }}
          stroke="oklch(0.28 0.02 240)"
          domain={[0, 100]}
          label={{
            value: "Coherence (%)",
            angle: -90,
            position: "insideLeft",
            offset: 8,
            style: { fill: "oklch(0.78 0.15 200)", fontSize: 11 },
          }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 10, fill: "oklch(0.72 0.20 30)" }}
          stroke="oklch(0.28 0.02 240)"
          label={{
            value: "Energy (kWh)",
            angle: 90,
            position: "insideRight",
            offset: 8,
            style: { fill: "oklch(0.72 0.20 30)", fontSize: 11 },
          }}
        />
        <Tooltip
          contentStyle={{
            background: "oklch(0.18 0.025 240)",
            border: "1px solid oklch(0.28 0.02 240)",
            borderRadius: "8px",
            fontSize: "11px",
          }}
          formatter={(value: number, name: string) => {
            if (name === "coherence") return [`${value.toFixed(2)}%`, "Coherence"];
            if (name === "energy") return [`${value.toFixed(2)} kWh`, "Energy"];
            return [value, name];
          }}
          labelFormatter={(v) => `${v} mK`}
        />
        <ReferenceLine
          yAxisId="left"
          y={minCoherence}
          stroke="oklch(0.65 0.22 25)"
          strokeDasharray="4 4"
          label={{
            value: `Min ${minCoherence.toFixed(0)}%`,
            position: "right",
            style: { fill: "oklch(0.65 0.22 25)", fontSize: 10 },
          }}
        />
        {optimalTemp !== undefined && (
          <ReferenceLine
            yAxisId="left"
            x={optimalTemp}
            stroke="oklch(0.78 0.15 200)"
            strokeDasharray="2 2"
            label={{
              value: `Optimal ${optimalTemp.toFixed(0)} mK`,
              position: "top",
              style: { fill: "oklch(0.78 0.15 200)", fontSize: 10 },
            }}
          />
        )}
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="coherence"
          stroke="oklch(0.78 0.15 200)"
          strokeWidth={2}
          fill="url(#cohGrad)"
          dot={false}
        />
        <Area
          yAxisId="right"
          type="monotone"
          dataKey="energy"
          stroke="oklch(0.72 0.20 30)"
          strokeWidth={2}
          fill="url(#energyGrad)"
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";
import { useAppStore } from "@/lib/store/app-store";

export function MiniTrendChart() {
  const thermal = useAppStore((s) => s.thermal);
  const ambientC = useAppStore((s) => s.ambientC);

  const data = thermal.length > 0
    ? thermal.map((o, i) => ({
        t: i,
        temp: o.temperatureC,
      }))
    : Array.from({ length: 24 }, (_, i) => ({
        t: i,
        temp: ambientC + Math.sin(i / 4) * 1.5,
      }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <ComposedChart data={data} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.78 0.15 200)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="oklch(0.78 0.15 200)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 240)" />
        <XAxis dataKey="t" tick={{ fontSize: 10, fill: "oklch(0.68 0.02 240)" }} stroke="oklch(0.28 0.02 240)" />
        <YAxis tick={{ fontSize: 10, fill: "oklch(0.68 0.02 240)" }} stroke="oklch(0.28 0.02 240)" domain={["auto", "auto"]} />
        <Tooltip
          contentStyle={{
            background: "oklch(0.18 0.025 240)",
            border: "1px solid oklch(0.28 0.02 240)",
            borderRadius: "8px",
            fontSize: "11px",
          }}
          labelStyle={{ color: "oklch(0.68 0.02 240)" }}
        />
        <Area
          type="monotone"
          dataKey="temp"
          stroke="oklch(0.78 0.15 200)"
          strokeWidth={2}
          fill="url(#tempGrad)"
          dot={false}
        />
        <ReferenceLine y={25} stroke="oklch(0.65 0.18 145)" strokeDasharray="4 4" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

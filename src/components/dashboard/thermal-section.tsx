"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Thermometer,
  TrendingUp,
  Activity,
  AlertTriangle,
  RefreshCw,
  MapPin,
  Clock,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { useAppStore } from "@/lib/store/app-store";
import { SCENARIOS } from "@/lib/scientific/types";
import { processThermal } from "@/lib/scientific/thermal";
import { toast } from "@/hooks/use-toast";

export function ThermalSection() {
  const thermal = useAppStore((s) => s.thermal);
  const setThermal = useAppStore((s) => s.setThermal);
  const scenario = useAppStore((s) => s.scenario);
  const setScenario = useAppStore((s) => s.setScenario);
  const ambientC = useAppStore((s) => s.ambientC);
  const setAmbientC = useAppStore((s) => s.setAmbientC);
  const [loading, setLoading] = useState(false);
  const [customBase, setCustomBase] = useState(28);
  const [customDelta, setCustomDelta] = useState(5);

  // Load history on mount or when scenario changes
  useEffect(() => {
    refreshHistory();
  }, [scenario]);

  async function refreshHistory() {
    setLoading(true);
    try {
      const res = await fetch(`/api/thermal/history?scenario=${scenario}&hours=24`);
      const data = await res.json();
      if (data.observations) {
        setThermal(data.observations);
        if (data.observations.length > 0) {
          setAmbientC(data.observations[data.observations.length - 1].temperatureC);
        }
      }
    } catch (err) {
      toast({ title: "Failed to fetch thermal history", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function runCustomSim() {
    setLoading(true);
    try {
      const res = await fetch("/api/thermal/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseC: customBase,
          deltaC: customDelta,
          hours: 12,
        }),
      });
      const data = await res.json();
      if (data.observations) {
        setThermal(data.observations);
        setAmbientC(data.observations[data.observations.length - 1].temperatureC);
        toast({
          title: "Custom simulation complete",
          description: `Modeled ${data.observations.length}h of thermal data.`,
        });
      }
    } catch (err) {
      toast({ title: "Simulation failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const processed = processThermal(thermal);

  const chartData = thermal.map((o, i) => ({
    t: i,
    actual: o.temperatureC,
    forecast: i >= thermal.length - 6 ? processed.forecastSeries[i - (thermal.length - 6)] : null,
  }));

  return (
    <div className="space-y-4">
      {/* Header cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="stat-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="data-label">Current</span>
              <Thermometer className="w-3.5 h-3.5 text-cyan-300" />
            </div>
            <div className="data-value">{processed.current.toFixed(1)}°C</div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {thermal[thermal.length - 1]?.source ?? "synthetic"}
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="data-label">Moving Avg</span>
              <Activity className="w-3.5 h-3.5 text-cyan-300" />
            </div>
            <div className="data-value">{processed.movingAverage.toFixed(1)}°C</div>
            <div className="text-[10px] text-muted-foreground mt-1">6h window</div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="data-label">Anomaly</span>
              <AlertTriangle
                className={`w-3.5 h-3.5 ${
                  Math.abs(processed.anomaly) > 2 ? "text-amber-300" : "text-emerald-300"
                }`}
              />
            </div>
            <div
              className={`data-value ${
                Math.abs(processed.anomaly) > 2 ? "text-amber-300" : ""
              }`}
            >
              {processed.anomaly >= 0 ? "+" : ""}
              {processed.anomaly.toFixed(2)}°C
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">vs MA</div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="data-label">Rate of Change</span>
              <TrendingUp className="w-3.5 h-3.5 text-cyan-300" />
            </div>
            <div className="data-value">
              {processed.rateOfChange >= 0 ? "+" : ""}
              {processed.rateOfChange.toFixed(2)}°C/h
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              forecast {processed.forecast.toFixed(1)}°C
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card className="border-border bg-card/60">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Scenario:</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(SCENARIOS).map(([k, v]) => (
                <Button
                  key={k}
                  size="sm"
                  variant={scenario === k ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => setScenario(k as typeof scenario)}
                >
                  {v.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={refreshHistory}
              disabled={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scenario description */}
      <Card className="border-border bg-card/60">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium">
                {SCENARIOS[scenario].label}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {SCENARIOS[scenario].description}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Base ambient: <span className="font-mono">{SCENARIOS[scenario].ambientC}°C</span> · Volatility:{" "}
                <span className="font-mono">±{SCENARIOS[scenario].volatility}°C</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="history">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="history">History & Forecast</TabsTrigger>
          <TabsTrigger value="custom">Custom Simulation</TabsTrigger>
          <TabsTrigger value="raw">Raw Observations</TabsTrigger>
        </TabsList>
        <TabsContent value="history" className="mt-3">
          <Card className="border-border bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                24h Ambient Temperature
                <span className="ml-auto text-xs text-muted-foreground font-normal">
                  {thermal.length} observations
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ top: 10, right: 16, left: -10, bottom: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 240)" />
                  <XAxis
                    dataKey="t"
                    tick={{ fontSize: 10, fill: "oklch(0.68 0.02 240)" }}
                    stroke="oklch(0.28 0.02 240)"
                    label={{
                      value: "Hours ago (0 = now)",
                      position: "bottom",
                      offset: 4,
                      style: { fill: "oklch(0.68 0.02 240)", fontSize: 11 },
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "oklch(0.68 0.02 240)" }}
                    stroke="oklch(0.28 0.02 240)"
                    label={{
                      value: "Temperature (°C)",
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
                  />
                  <ReferenceLine y={25} stroke="oklch(0.65 0.18 145)" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="oklch(0.78 0.15 200)"
                    strokeWidth={2}
                    dot={false}
                    name="Actual"
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="oklch(0.68 0.22 350)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    name="Forecast"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="custom" className="mt-3">
          <Card className="border-border bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Custom Ambient Simulation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">
                    Base temperature: <span className="font-mono">{customBase}°C</span>
                  </Label>
                  <Slider
                    value={[customBase]}
                    min={-10}
                    max={50}
                    step={1}
                    onValueChange={(v) => setCustomBase(v[0])}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">
                    Delta over 12h: <span className="font-mono">+{customDelta}°C</span>
                  </Label>
                  <Slider
                    value={[customDelta]}
                    min={-10}
                    max={15}
                    step={0.5}
                    onValueChange={(v) => setCustomDelta(v[0])}
                  />
                </div>
              </div>
              <Button size="sm" onClick={runCustomSim} disabled={loading}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                Run Simulation
              </Button>
              <div className="text-xs text-muted-foreground">
                Custom simulations are labeled as <Badge variant="outline">synthetic</Badge> and never
                presented as real FortyGuard data.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="raw" className="mt-3">
          <Card className="border-border bg-card/60">
            <CardContent className="p-0">
              <div className="max-h-[420px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Timestamp</TableHead>
                      <TableHead className="text-xs">Temperature</TableHead>
                      <TableHead className="text-xs">Source</TableHead>
                      <TableHead className="text-xs">Quality</TableHead>
                      <TableHead className="text-xs">Scenario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {thermal.map((o, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-mono">
                          {new Date(o.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-medium">
                          {o.temperatureC.toFixed(1)}°C
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              o.source === "fortyguard"
                                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]"
                                : "bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px]"
                            }
                          >
                            {o.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{o.quality}</TableCell>
                        <TableCell className="text-xs">{o.scenario}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Atom, Save, RotateCcw } from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { DEFAULT_CONFIG, DEFAULT_NOISE, DEFAULT_COOLING } from "@/lib/scientific/types";
import { estimateCoherence } from "@/lib/scientific/quantum";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

export function QuantumSystemSection() {
  const config = useAppStore((s) => s.config);
  const updateConfig = useAppStore((s) => s.updateConfig);
  const updateNoiseParams = useAppStore((s) => s.updateNoiseParams);
  const updateCoolingParams = useAppStore((s) => s.updateCoolingParams);
  const setConfig = useAppStore((s) => s.setConfig);
  const [name, setName] = useState(config.name);

  function save() {
    updateConfig({ name });
    toast({
      title: "Configuration updated",
      description: "Changes applied to the active quantum system.",
    });
  }

  function resetDefaults() {
    setConfig({ ...DEFAULT_CONFIG, noiseParams: { ...DEFAULT_NOISE }, coolingParams: { ...DEFAULT_COOLING } });
    setName(DEFAULT_CONFIG.name);
    toast({ title: "Reset to defaults" });
  }

  // Live preview of coherence at the midpoint of the temperature range
  const midT = (config.temperatureMinMK + config.temperatureMaxMK) / 2;
  const preview = estimateCoherence(midT, config);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: System identity */}
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Atom className="w-4 h-4 text-primary" />
              System Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Qubit Type</Label>
              <Select
                value={config.qubitType}
                onValueChange={(v) => updateConfig({ qubitType: v as any })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="superconducting">Superconducting</SelectItem>
                  <SelectItem value="trapped-ion">Trapped Ion</SelectItem>
                  <SelectItem value="spin-qubit">Spin Qubit</SelectItem>
                  <SelectItem value="photonic">Photonic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Qubit Count</Label>
                <Input
                  type="number"
                  value={config.qubitCount}
                  onChange={(e) => updateConfig({ qubitCount: Number(e.target.value) })}
                  className="h-9 text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Frequency (GHz)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={config.qubitFrequencyGHz}
                  onChange={(e) => updateConfig({ qubitFrequencyGHz: Number(e.target.value) })}
                  className="h-9 text-sm font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Target T1 (µs)</Label>
                <Input
                  type="number"
                  step="1"
                  value={config.targetT1Microseconds}
                  onChange={(e) => updateConfig({ targetT1Microseconds: Number(e.target.value) })}
                  className="h-9 text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Target T2 (µs)</Label>
                <Input
                  type="number"
                  step="1"
                  value={config.targetT2Microseconds}
                  onChange={(e) => updateConfig({ targetT2Microseconds: Number(e.target.value) })}
                  className="h-9 text-sm font-mono"
                />
              </div>
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label className="text-xs">
                Target coherence: <span className="font-mono">{(config.targetCoherence * 100).toFixed(0)}%</span>
              </Label>
              <Slider
                value={[config.targetCoherence * 100]}
                min={50}
                max={99}
                step={1}
                onValueChange={(v) => updateConfig({ targetCoherence: v[0] / 100 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Min coherence (constraint): <span className="font-mono">{(config.minCoherence * 100).toFixed(0)}%</span>
              </Label>
              <Slider
                value={[config.minCoherence * 100]}
                min={40}
                max={95}
                step={1}
                onValueChange={(v) => updateConfig({ minCoherence: v[0] / 100 })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Middle: Temperature range & preview */}
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Temperature Range & Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Min (mK)</Label>
                <Input
                  type="number"
                  value={config.temperatureMinMK}
                  onChange={(e) => updateConfig({ temperatureMinMK: Number(e.target.value) })}
                  className="h-9 text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Max (mK)</Label>
                <Input
                  type="number"
                  value={config.temperatureMaxMK}
                  onChange={(e) => updateConfig({ temperatureMaxMK: Number(e.target.value) })}
                  className="h-9 text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Step (mK)</Label>
                <Input
                  type="number"
                  value={config.temperatureStepMK}
                  onChange={(e) => updateConfig({ temperatureStepMK: Number(e.target.value) })}
                  className="h-9 text-sm font-mono"
                />
              </div>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/30">
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
                Midpoint preview @ {midT.toFixed(0)} mK
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <PreviewRow label="Coherence" value={`${(preview.coherenceScore * 100).toFixed(1)}%`} />
                <PreviewRow label="T1" value={`${preview.T1Microseconds.toFixed(2)} µs`} />
                <PreviewRow label="T2" value={`${preview.T2Microseconds.toFixed(2)} µs`} />
                <PreviewRow label="T2*" value={`${preview.T2StarMicroseconds.toFixed(2)} µs`} />
                <PreviewRow label="Thermal pop." value={preview.thermalPopulation.toFixed(4)} />
                <PreviewRow label="Thermal noise" value={`${(preview.thermalNoise * 100).toFixed(1)}%`} />
              </div>
              <div className="mt-2">
                <Badge
                  className={
                    preview.decoherenceRisk === "LOW"
                      ? "badge-risk-low"
                      : preview.decoherenceRisk === "MEDIUM"
                      ? "badge-risk-medium"
                      : preview.decoherenceRisk === "HIGH"
                      ? "badge-risk-high"
                      : "badge-risk-critical"
                  }
                >
                  Risk: {preview.decoherenceRisk}
                </Badge>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground leading-relaxed">
              These values are <strong>SIMULATION / RESEARCH APPROXIMATION</strong> — generated
              from the documented physics-inspired model, not measured from real hardware.
            </div>
          </CardContent>
        </Card>

        {/* Right: Noise & Cooling */}
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Noise & Cooling Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
                Noise Model
              </div>
              <div className="space-y-2">
                <SliderRow
                  label="Flux noise amp"
                  value={config.noiseParams.fluxNoiseAmplitude}
                  min={1e-7}
                  max={1e-5}
                  step={1e-7}
                  format={(v) => v.toExponential(1)}
                  onChange={(v) => updateNoiseParams({ fluxNoiseAmplitude: v })}
                />
                <SliderRow
                  label="Charge noise factor"
                  value={config.noiseParams.chargeNoiseFactor}
                  min={0}
                  max={0.2}
                  step={0.005}
                  format={(v) => v.toFixed(3)}
                  onChange={(v) => updateNoiseParams({ chargeNoiseFactor: v })}
                />
                <SliderRow
                  label="Photon occupation"
                  value={config.noiseParams.photonOccupation}
                  min={0}
                  max={1}
                  step={0.05}
                  format={(v) => v.toFixed(2)}
                  onChange={(v) => updateNoiseParams({ photonOccupation: v })}
                />
              </div>
            </div>
            <Separator />
            <div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
                Cooling Model
              </div>
              <div className="space-y-2">
                <SliderRow
                  label="Carnot efficiency"
                  value={config.coolingParams.carnotEfficiency}
                  min={0.03}
                  max={0.3}
                  step={0.01}
                  format={(v) => v.toFixed(2)}
                  onChange={(v) => updateCoolingParams({ carnotEfficiency: v })}
                />
                <SliderRow
                  label="Base heat load (W)"
                  value={config.coolingParams.baseHeatLoadWatts}
                  min={0.01}
                  max={0.5}
                  step={0.01}
                  format={(v) => v.toFixed(2)}
                  onChange={(v) => updateCoolingParams({ baseHeatLoadWatts: v })}
                />
                <SliderRow
                  label="Thermal conductance"
                  value={config.coolingParams.thermalConductance}
                  min={0.0001}
                  max={0.005}
                  step={0.0001}
                  format={(v) => v.toFixed(4)}
                  onChange={(v) => updateCoolingParams({ thermalConductance: v })}
                />
                <SliderRow
                  label="Baseline target (mK)"
                  value={config.coolingParams.baselineTargetMK}
                  min={5}
                  max={50}
                  step={1}
                  format={(v) => v.toFixed(0)}
                  onChange={(v) => updateCoolingParams({ baselineTargetMK: v })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer actions */}
      <Card className="border-border bg-card/60">
        <CardContent className="p-3 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={resetDefaults}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset Defaults
          </Button>
          <Button size="sm" onClick={save}>
            <Save className="w-3.5 h-3.5 mr-1.5" />
            Apply Configuration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium">{value}</span>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="text-xs font-mono">{format(value)}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
      />
    </div>
  );
}

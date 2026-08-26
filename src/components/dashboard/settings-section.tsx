"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Settings as SettingsIcon,
  KeyRound,
  Sliders,
  Database,
  Shield,
  ExternalLink,
} from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

export function SettingsSection() {
  const weights = useAppStore((s) => s.weights);
  const setWeights = useAppStore((s) => s.setWeights);
  const minCoherence = useAppStore((s) => s.minCoherence);
  const setMinCoherence = useAppStore((s) => s.setMinCoherence);

  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.fortyguard.com");

  function saveEnv() {
    // Note: in production these would be saved server-side.
    // For the hackathon prototype we document them and ask the user
    // to set them in .env.local
    toast({
      title: "Environment variables documented",
      description: `Add FORTYGUARD_API_KEY and FORTYGUARD_BASE_URL to .env.local and restart the dev server.`,
    });
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <Card className="border-border bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />
            FortyGuard API Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">FORTYGUARD_API_KEY</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="your-api-key-here"
                className="h-9 text-sm font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">FORTYGUARD_BASE_URL</Label>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="h-9 text-sm font-mono"
              />
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            When the API key is present, the application will use real
            FortyGuard temperature data. Without it, the app falls back to
            clearly-labeled simulation mode.
          </div>
          <Button size="sm" variant="outline" onClick={saveEnv}>
            Save Configuration
          </Button>
          <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
            <Shield className="w-3.5 h-3.5 inline mr-1.5" />
            API keys are never exposed to the frontend in production. For this
            prototype, set credentials in <code className="font-mono">.env.local</code>:
            <pre className="mt-2 p-2 bg-black/30 rounded text-[10px] font-mono">
{`FORTYGUARD_API_KEY=...
FORTYGUARD_BASE_URL=https://api.fortyguard.com`}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            Default Optimization Weights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Coherence weight: <span className="font-mono">{weights.coherence.toFixed(2)}</span>
              </Label>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={weights.coherence}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setWeights({ coherence: v, energy: 1 - v });
                }}
                className="h-9 text-sm font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Energy weight: <span className="font-mono">{weights.energy.toFixed(2)}</span>
              </Label>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={weights.energy}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setWeights({ coherence: 1 - v, energy: v });
                }}
                className="h-9 text-sm font-mono"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Default min coherence: <span className="font-mono">{(minCoherence * 100).toFixed(0)}%</span>
            </Label>
            <Input
              type="number"
              min={0.4}
              max={0.95}
              step={0.01}
              value={minCoherence}
              onChange={(e) => setMinCoherence(Number(e.target.value))}
              className="h-9 text-sm font-mono"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            Database & Storage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <Row label="Engine" value="SQLite (via Prisma)" />
          <Row label="File" value="/home/z/my-project/db/custom.db" />
          <Row label="Models" value="QuantumConfiguration, ThermalObservation, Experiment, AgentDecision, OptimizationCache" />
          <Separator className="my-2" />
          <div className="text-muted-foreground">
            All experiments are stored with full reproducibility metadata:
            configuration snapshot, optimization weights, ambient scenario,
            sweep results, and Pareto frontier.
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-primary" />
            Project Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <Row label="Project" value="Quantum-Thermal Qubit Coherence Optimizer" />
          <Row label="Event" value="FortyGuard Global AI Hackathon '26" />
          <Row label="Primary track" value="Track 05 — Model Designing" />
          <Row label="Secondary" value="Track 02 — Future Buildings & Energy" />
          <Row label="Optional" value="Track 06 — Agentic AI" />
          <Row label="Stack" value="Next.js 16, TypeScript, Tailwind, Prisma, Recharts" />
          <Row label="Status" value="Research Prototype" />
          <div className="pt-2 flex flex-wrap gap-1">
            <Badge variant="outline" className="text-[10px]">
              v0.1.0
            </Badge>
            <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px]">
              Simulation Mode
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-mono">{value}</span>
    </div>
  );
}

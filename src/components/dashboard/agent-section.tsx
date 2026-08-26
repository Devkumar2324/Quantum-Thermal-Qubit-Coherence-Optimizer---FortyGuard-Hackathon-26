"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Bot,
  Send,
  Sparkles,
  Activity,
  Thermometer,
  Target,
  Zap,
  AlertCircle,
  Shield,
} from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { toast } from "@/hooks/use-toast";

interface AgentMessage {
  role: "agent" | "user";
  content: string;
  timestamp: string;
  recommendation?: string;
  recommendedTemp?: number;
  predictedCoherence?: number;
  predictedEnergy?: number;
}

export function AgentSection() {
  const optimization = useAppStore((s) => s.optimization);
  const config = useAppStore((s) => s.config);
  const thermal = useAppStore((s) => s.thermal);
  const ambientC = useAppStore((s) => s.ambientC);
  const scenario = useAppStore((s) => s.scenario);
  const lastExperimentId = useAppStore((s) => s.lastExperimentId);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [userQuery, setUserQuery] = useState("");

  async function runAnalysis() {
    if (!optimization) {
      toast({
        title: "No optimization available",
        description: "Run the optimizer first to give the agent context.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/agent/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optimization,
          thermal: { summary: thermal.slice(-6).map((t) => t.temperatureC) },
          config,
          scenario,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast({ title: "Agent error", description: data.error, variant: "destructive" });
        return;
      }
      const explanation = data.explanation as string;
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: explanation,
          timestamp: data.timestamp,
          recommendedTemp: optimization.optimal?.temperatureMK,
          predictedCoherence: optimization.optimal?.coherenceScore,
          predictedEnergy: optimization.optimal?.energyConsumptionKWh,
        },
      ]);

      // Log the decision
      try {
        await fetch("/api/agent/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trigger: "manual",
            observation: {
              ambientC,
              scenario,
              thermal: thermal.slice(-6).map((t) => t.temperatureC),
              config: config.name,
            },
            recommendation: explanation,
            recommendedTemp: optimization.optimal?.temperatureMK,
            predictedCoherence: optimization.optimal?.coherenceScore,
            predictedEnergy: optimization.optimal?.energyConsumptionKWh,
            experimentId: lastExperimentId,
          }),
        });
      } catch {
        // ignore logging errors
      }
    } catch (err: any) {
      toast({
        title: "Agent error",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function askQuestion() {
    if (!userQuery.trim()) return;
    const q = userQuery;
    setUserQuery("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: q, timestamp: new Date().toISOString() },
    ]);
    setLoading(true);
    try {
      // Use the LLM to answer a free-form question with full context
      const sysPrompt = `You are the Quantum-Thermal Coherence Optimizer AI. Answer user questions about the current optimization result in clear, scientifically honest language. Distinguish REAL DATA (FortyGuard) from SIMULATED DATA (qubit params, T1/T2, coherence) and MODEL OUTPUT (predictions). Use "modeled" language. Never invent numbers. Keep answers concise (3-5 sentences).`;

      const ctx = optimization
        ? `CONTEXT:
- Ambient: ${ambientC.toFixed(1)}°C, scenario: ${scenario}
- Optimal operating temp: ${optimization.optimal?.temperatureMK ?? "n/a"} mK
- Predicted coherence: ${((optimization.optimal?.coherenceScore ?? 0) * 100).toFixed(1)}%
- Modeled cooling energy: ${optimization.optimal?.energyConsumptionKWh?.toFixed(2) ?? "n/a"} kWh/day
- Baseline energy: ${optimization.baseline.energyKWh.toFixed(2)} kWh/day
- Modeled energy savings: ${optimization.metrics.energySavingPercent.toFixed(1)}%
- Decoherence risk: ${optimization.optimal?.decoherenceRisk ?? "n/a"}
- Feasible solutions: ${optimization.metrics.feasibleCount}/${optimization.metrics.feasibleCount + optimization.metrics.infeasibleCount}

USER QUESTION: ${q}`
        : `No optimization has been run yet. Answer the user question generally about quantum-thermal coherence optimization.

USER QUESTION: ${q}`;

      // Use the chat completion via our explain endpoint with custom prompt
      const res = await fetch("/api/agent/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optimization: optimization ?? { optimal: null, baseline: { point: { ambientC } }, minCoherence: config.minCoherence, metrics: {} },
          thermal: { summary: q },
          config,
          scenario,
          customPrompt: `${sysPrompt}\n\n${ctx}`,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast({ title: "Agent error", description: data.error, variant: "destructive" });
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: data.explanation,
          timestamp: data.timestamp,
        },
      ]);
    } catch (err: any) {
      toast({
        title: "Agent error",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left column: Agent info */}
      <div className="space-y-4">
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              Quantum Thermal Agent
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 p-2 rounded-md bg-muted/40">
              <Activity className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <div className="text-xs">
                <div className="font-medium">Monitoring</div>
                <div className="text-muted-foreground">
                  Tracks ambient conditions and qubit operating state.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded-md bg-muted/40">
              <Target className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <div className="text-xs">
                <div className="font-medium">Prediction</div>
                <div className="text-muted-foreground">
                  Estimates coherence and cooling energy across candidates.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded-md bg-muted/40">
              <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <div className="text-xs">
                <div className="font-medium">Recommendation</div>
                <div className="text-muted-foreground">
                  Explains why an operating point was chosen.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/30">
              <Shield className="w-3.5 h-3.5 text-amber-300 mt-0.5 shrink-0" />
              <div className="text-xs">
                <div className="font-medium text-amber-200">Safety Constraint</div>
                <div className="text-amber-200/80">
                  The LLM does NOT perform mathematical optimization. All
                  numerical results come from deterministic scientific code.
                  Agent actions are logged recommendations only — never hardware commands.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Current Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <ContextRow icon={Thermometer} label="Ambient" value={`${ambientC.toFixed(1)}°C`} />
            <ContextRow icon={Activity} label="Scenario" value={scenario} />
            <ContextRow
              icon={Target}
              label="Optimal T"
              value={optimization?.optimal ? `${optimization.optimal.temperatureMK.toFixed(0)} mK` : "—"}
            />
            <ContextRow
              icon={Zap}
              label="Energy"
              value={optimization?.optimal ? `${optimization.optimal.energyConsumptionKWh.toFixed(2)} kWh` : "—"}
            />
            <ContextRow
              icon={AlertCircle}
              label="Risk"
              value={optimization?.optimal?.decoherenceRisk ?? "—"}
            />
          </CardContent>
        </Card>

        <Button
          className="w-full"
          onClick={runAnalysis}
          disabled={loading || !optimization}
        >
          <Sparkles className={`w-4 h-4 mr-2 ${loading ? "animate-pulse" : ""}`} />
          {loading ? "Analyzing..." : "Run Full Analysis"}
        </Button>
      </div>

      {/* Right column: Chat */}
      <Card className="lg:col-span-2 border-border bg-card/60 flex flex-col h-[700px]">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            AI Thermal Analyst
            <Badge variant="outline" className="ml-auto text-[10px]">
              {messages.length} messages
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-12">
              <Bot className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <div className="font-medium">No analysis yet</div>
              <div className="mt-1">
                Click &quot;Run Full Analysis&quot; to get an LLM-generated
                explanation of the current optimization.
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 text-xs ${
                  m.role === "user"
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted/60 border border-border"
                }`}
              >
                {m.role === "agent" && (
                  <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-muted-foreground">
                    <Bot className="w-3 h-3" />
                    <span>AI Thermal Analyst</span>
                    <span className="ml-auto">{new Date(m.timestamp).toLocaleTimeString()}</span>
                  </div>
                )}
                <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                {m.recommendedTemp && (
                  <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap gap-2">
                    {m.recommendedTemp && (
                      <Badge variant="outline" className="text-[10px]">
                        T: {m.recommendedTemp.toFixed(0)} mK
                      </Badge>
                    )}
                    {m.predictedCoherence !== undefined && (
                      <Badge variant="outline" className="text-[10px]">
                        C: {(m.predictedCoherence * 100).toFixed(1)}%
                      </Badge>
                    )}
                    {m.predictedEnergy !== undefined && (
                      <Badge variant="outline" className="text-[10px]">
                        E: {m.predictedEnergy.toFixed(2)} kWh
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted/60 border border-border rounded-lg p-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 animate-pulse" />
                  <span>Analyzing...</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <div className="p-3 border-t border-border space-y-2">
          <div className="flex gap-2">
            <Textarea
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Ask a follow-up question about the optimization..."
              className="text-xs min-h-[44px] max-h-24 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  askQuestion();
                }
              }}
            />
            <Button size="sm" onClick={askQuestion} disabled={loading || !userQuery.trim()}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="text-[10px] text-muted-foreground">
            Press Enter to send · Shift+Enter for newline
          </div>
        </div>
      </Card>
    </div>
  );
}

function ContextRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground flex items-center gap-1.5">
        <Icon className="w-3 h-3" />
        {label}
      </span>
      <span className="font-mono font-medium">{value}</span>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FlaskConical, Eye, RefreshCw, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { toast } from "@/hooks/use-toast";

interface ExperimentRow {
  id: string;
  name: string;
  scenario: string;
  ambientTemp: number;
  tempMin: number;
  tempMax: number;
  coherenceWeight: number;
  energyWeight: number;
  minCoherence: number;
  status: string;
  optimalTemp: number | null;
  optimalCoherence: number | null;
  optimalEnergy: number | null;
  baselineEnergy: number | null;
  energySavings: number | null;
  createdAt: string;
  config?: { name: string };
}

export function ExperimentsSection() {
  const [experiments, setExperiments] = useState<ExperimentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const setActiveSection = useAppStore((s) => s.setActiveSection);
  const setLastExperimentId = useAppStore((s) => s.setLastExperimentId);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/experiments");
      const data = await res.json();
      setExperiments(data.experiments ?? []);
    } catch {
      toast({ title: "Failed to load experiments", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function viewExperiment(id: string) {
    setLastExperimentId(id);
    setActiveSection("results");
  }

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card/60">
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" />
            Experiment History
            <span className="ml-1 text-xs text-muted-foreground font-normal">
              {experiments.length} runs
            </span>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {experiments.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No experiments yet. Run the optimizer to create one.
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Scenario</TableHead>
                    <TableHead className="text-xs">Ambient</TableHead>
                    <TableHead className="text-xs">Optimal T</TableHead>
                    <TableHead className="text-xs">Coherence</TableHead>
                    <TableHead className="text-xs">Savings</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Created</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {experiments.map((e) => (
                    <TableRow key={e.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs max-w-[200px] truncate">
                        <span className="font-medium">{e.name}</span>
                        {e.config?.name && (
                          <div className="text-[10px] text-muted-foreground truncate">
                            {e.config.name}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[10px]">
                          {e.scenario}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{e.ambientTemp.toFixed(1)}°C</TableCell>
                      <TableCell className="text-xs font-mono">
                        {e.optimalTemp ? `${e.optimalTemp.toFixed(0)} mK` : "—"}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {e.optimalCoherence ? `${(e.optimalCoherence * 100).toFixed(1)}%` : "—"}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {e.energySavings !== null ? (
                          <span className={e.energySavings > 0 ? "text-emerald-300" : "text-rose-300"}>
                            {e.energySavings.toFixed(1)}%
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            e.status === "completed"
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]"
                              : e.status === "infeasible"
                              ? "bg-rose-500/15 text-rose-300 border-rose-500/30 text-[10px]"
                              : "bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px]"
                          }
                        >
                          {e.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">
                        {new Date(e.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => viewExperiment(e.id)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card/60">
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground leading-relaxed">
            <strong>Reproducibility:</strong> Every experiment stores the full
            temperature sweep, Pareto frontier, optimization weights, coherence
            threshold, quantum configuration, and ambient scenario. Use the
            Results view to inspect any past experiment in detail.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

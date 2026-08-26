"use client";

import {
  LayoutDashboard,
  Thermometer,
  Atom,
  TrendingUp,
  Trophy,
  FlaskConical,
  BarChart3,
  BookOpen,
  Bot,
  Settings,
  Activity,
} from "lucide-react";
import { useAppStore, SectionId } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";

const NAV: { id: SectionId; label: string; icon: React.ElementType; group: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { id: "thermal", label: "Thermal", icon: Thermometer, group: "Overview" },
  { id: "quantum-system", label: "Quantum System", icon: Atom, group: "Overview" },
  { id: "optimizer", label: "Optimizer", icon: TrendingUp, group: "Research" },
  { id: "strategies", label: "Strategy Comparison", icon: Trophy, group: "Research" },
  { id: "experiments", label: "Experiments", icon: FlaskConical, group: "Research" },
  { id: "results", label: "Results", icon: BarChart3, group: "Research" },
  { id: "research", label: "Research", icon: BookOpen, group: "Research" },
  { id: "agent", label: "AI Agent", icon: Bot, group: "Intelligence" },
  { id: "settings", label: "Settings", icon: Settings, group: "Intelligence" },
];

export function Sidebar() {
  const activeSection = useAppStore((s) => s.activeSection);
  const setActiveSection = useAppStore((s) => s.setActiveSection);
  const fortyGuardStatus = useAppStore((s) => s.fortyGuardStatus);
  const optimization = useAppStore((s) => s.optimization);

  const groups = Array.from(new Set(NAV.map((n) => n.group)));

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-sidebar/80 backdrop-blur-sm flex flex-col">
      {/* Brand */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-600 flex items-center justify-center glow-cyan">
              <Atom className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight truncate">
              Quantum-Thermal
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground leading-tight">
              Coherence Optimizer
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {groups.map((group) => (
          <div key={group}>
            <div className="px-3 mb-1.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
              {group}
            </div>
            <div className="space-y-0.5">
              {NAV.filter((n) => n.group === group).map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all",
                      active
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60",
                    )}
                  >
                    <Icon className={cn("w-4 h-4", active && "text-primary")} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.id === "optimizer" && optimization && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Status footer */}
      <div className="p-3 border-t border-border space-y-2">
        <div className="flex items-center gap-2 text-[11px]">
          <div
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md border",
              fortyGuardStatus === "available"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-amber-500/30 bg-amber-500/10 text-amber-300",
            )}
          >
            <Activity className="w-3 h-3" />
            <span>
              {fortyGuardStatus === "available"
                ? "FortyGuard Live"
                : "Simulation Mode"}
            </span>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground">
          Hackathon&apos;26 · Track 05
        </div>
      </div>
    </aside>
  );
}

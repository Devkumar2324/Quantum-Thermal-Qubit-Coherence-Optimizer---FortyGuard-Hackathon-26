import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

// POST /api/agent/explain
// Body: { experiment, optimization, thermal }
// Returns an LLM-generated natural-language explanation of the optimization.
// The LLM is used ONLY for explanation/interpretation — never for math.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { optimization, thermal, config, scenario } = body;

    if (!optimization) {
      return NextResponse.json(
        { error: "Missing optimization payload" },
        { status: 400 },
      );
    }

    const opt = optimization;
    const thermalSummary =
      thermal?.processed ?? thermal?.summary ?? "n/a";

    const systemPrompt = `You are the Quantum-Thermal Coherence Optimizer AI — a research-grade thermal analyst for quantum computing systems.
Your job is to explain optimization decisions in clear, scientifically honest language.
CRITICAL RULES:
- All numerical values come from deterministic scientific code, not from you. Never recompute or invent numbers.
- Always clearly distinguish REAL DATA (FortyGuard temperature) from SIMULATED DATA (qubit parameters, T1/T2, coherence) and MODEL OUTPUT (predicted coherence, optimized temperature).
- Use "modeled" language ("modeled energy savings", "predicted coherence", "estimated T1").
- Never claim results are real quantum hardware measurements.
- Be concise: 4-6 sentences for explanation, optionally a 2-3 bullet action list.`;

    const userPrompt = `Explain the following optimization result and recommend next actions.

QUANTUM SYSTEM:
- Name: ${config?.name ?? "Demo System"}
- Qubit type: ${config?.qubitType ?? "superconducting"}
- Qubit count: ${config?.qubitCount ?? 50}
- Frequency: ${config?.qubitFrequencyGHz ?? 5} GHz

THERMAL CONDITIONS:
- Scenario: ${scenario ?? "normal"}
- Ambient temperature: ${opt.baseline?.point?.ambientC ?? "n/a"} °C
- Thermal summary: ${JSON.stringify(thermalSummary)}

OPTIMIZATION RESULT:
- Optimal operating temperature: ${opt.optimal?.temperatureMK ?? "n/a"} mK
- Predicted coherence: ${((opt.optimal?.coherenceScore ?? 0) * 100).toFixed(1)}%
- Predicted T1: ${opt.optimal?.T1Microseconds?.toFixed(2) ?? "n/a"} µs
- Predicted T2: ${opt.optimal?.T2Microseconds?.toFixed(2) ?? "n/a"} µs
- Modeled cooling energy: ${opt.optimal?.energyConsumptionKWh?.toFixed(2) ?? "n/a"} kWh/day
- Baseline energy (aggressive cooling): ${opt.baseline?.energyKWh?.toFixed(2) ?? "n/a"} kWh/day
- Modeled energy savings: ${opt.metrics?.energySavingPercent?.toFixed(1) ?? "n/a"} %
- Coherence constraint (minimum): ${(opt.minCoherence * 100).toFixed(1)} %
- Feasible solutions: ${opt.metrics?.feasibleCount ?? 0} / ${(opt.metrics?.feasibleCount ?? 0) + (opt.metrics?.infeasibleCount ?? 0)}
- Pareto-optimal solutions: ${opt.metrics?.paretoCount ?? 0}
- Decoherence risk: ${opt.optimal?.decoherenceRisk ?? "n/a"}
- No-feasible-solution flag: ${opt.noFeasibleSolution}

Provide:
1. A 4-6 sentence explanation of why this operating point was chosen, what trade-off it represents, and how it compares to the aggressive baseline.
2. A 2-3 bullet list of recommended next actions (e.g. "expand temperature range", "tighten coherence threshold", "monitor ambient trend").`;

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 600,
    });

    const explanation =
      completion.choices?.[0]?.message?.content ??
      "No explanation available.";

    return NextResponse.json({
      explanation,
      model: "z-ai-web-dev-sdk",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Agent explain error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Agent explanation failed" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/agent/analyze
// Body: { trigger, observation, recommendation, recommendedTemp,
//         predictedCoherence, predictedEnergy, experimentId }
// Persists an AgentDecision record.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!db) {
      return NextResponse.json({
        decision: { ...body, id: "ephemeral", timestamp: new Date().toISOString() },
      });
    }
    const decision = await db.agentDecision.create({
      data: {
        experimentId: body.experimentId ?? null,
        trigger: body.trigger ?? "manual",
        observation: JSON.stringify(body.observation ?? {}),
        recommendation: body.recommendation ?? "",
        recommendedTemp: body.recommendedTemp ?? null,
        predictedCoherence: body.predictedCoherence ?? null,
        predictedEnergy: body.predictedEnergy ?? null,
        status: "logged",
      },
    });
    return NextResponse.json({ decision });
  } catch (err: any) {
    console.error("Agent decision log error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to log agent decision" },
      { status: 500 },
    );
  }
}

// GET /api/agent/analyze - fetch recent decisions
export async function GET() {
  if (!db) {
    return NextResponse.json({ decisions: [] });
  }
  try {
    const decisions = await db.agentDecision.findMany({
      orderBy: { timestamp: "desc" },
      take: 50,
      include: { experiment: true },
    });
    return NextResponse.json({ decisions });
  } catch (err: any) {
    console.error("List decisions error:", err);
    return NextResponse.json({ decisions: [] });
  }
}

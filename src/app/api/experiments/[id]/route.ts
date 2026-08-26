import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/experiments/[id] - fetch a single experiment with full results
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }
  try {
    const exp = await db.experiment.findUnique({
      where: { id },
      include: { config: true, agentDecisions: true },
    });
    if (!exp) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      experiment: {
        ...exp,
        paretoFrontier: exp.paretoFrontier
          ? JSON.parse(exp.paretoFrontier)
          : [],
        sweepResults: exp.sweepResults ? JSON.parse(exp.sweepResults) : [],
        noiseParams: exp.config?.noiseParams
          ? JSON.parse(exp.config.noiseParams)
          : {},
        coolingParams: exp.config?.coolingParams
          ? JSON.parse(exp.config.coolingParams)
          : {},
      },
    });
  } catch (err: any) {
    console.error("Fetch experiment error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch experiment" },
      { status: 500 },
    );
  }
}

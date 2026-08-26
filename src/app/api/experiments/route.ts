import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/experiments - list all experiments
export async function GET() {
  if (!db) {
    return NextResponse.json({ experiments: [] });
  }
  try {
    const experiments = await db.experiment.findMany({
      include: { config: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ experiments });
  } catch (err: any) {
    console.error("List experiments error:", err);
    return NextResponse.json({ experiments: [] });
  }
}

// POST /api/experiments - create a new experiment record manually
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 },
      );
    }
    const exp = await db.experiment.create({
      data: {
        name: body.name,
        scenario: body.scenario ?? "custom",
        ambientTemp: body.ambientTemp ?? 25,
        configId: body.configId,
        tempMin: body.tempMin ?? 10,
        tempMax: body.tempMax ?? 100,
        tempStep: body.tempStep ?? 2,
        coherenceWeight: body.coherenceWeight ?? 0.7,
        energyWeight: body.energyWeight ?? 0.3,
        minCoherence: body.minCoherence ?? 0.85,
        status: body.status ?? "completed",
        optimalTemp: body.optimalTemp,
        optimalCoherence: body.optimalCoherence,
        optimalEnergy: body.optimalEnergy,
        baselineEnergy: body.baselineEnergy,
        energySavings: body.energySavings,
        paretoFrontier: body.paretoFrontier
          ? JSON.stringify(body.paretoFrontier)
          : null,
        sweepResults: body.sweepResults
          ? JSON.stringify(body.sweepResults)
          : null,
      },
    });
    return NextResponse.json({ experiment: exp });
  } catch (err: any) {
    console.error("Create experiment error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to create experiment" },
      { status: 500 },
    );
  }
}

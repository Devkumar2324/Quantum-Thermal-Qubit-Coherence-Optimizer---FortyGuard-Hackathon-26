import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEFAULT_CONFIG } from "@/lib/scientific/types";

// GET /api/quantum/configurations
export async function GET() {
  if (!db) {
    return NextResponse.json({ configurations: [DEFAULT_CONFIG] });
  }
  try {
    const configs = await db.quantumConfiguration.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
    const mapped = configs.map((c) => ({
      id: c.id,
      name: c.name,
      qubitType: c.qubitType as any,
      qubitCount: c.qubitCount,
      qubitFrequencyGHz: c.qubitFrequency,
      targetCoherence: c.targetCoherence,
      targetT1Microseconds: c.targetT1,
      targetT2Microseconds: c.targetT2,
      minCoherence: c.minCoherence,
      temperatureMinMK: c.temperatureMin,
      temperatureMaxMK: c.temperatureMax,
      temperatureStepMK: c.temperatureStep,
      noiseModel: c.noiseModel,
      coolingModel: c.coolingModel,
      noiseParams: c.noiseParams ? JSON.parse(c.noiseParams) : {},
      coolingParams: c.coolingParams ? JSON.parse(c.coolingParams) : {},
    }));
    return NextResponse.json({ configurations: mapped });
  } catch (err: any) {
    console.error("List configurations error:", err);
    return NextResponse.json({ configurations: [DEFAULT_CONFIG] });
  }
}

// POST /api/quantum/configurations - create or update a configuration
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 },
      );
    }
    const created = await db.quantumConfiguration.create({
      data: {
        name: body.name,
        qubitType: body.qubitType ?? "superconducting",
        qubitCount: body.qubitCount ?? 50,
        qubitFrequency: body.qubitFrequencyGHz ?? 5.0,
        targetCoherence: body.targetCoherence ?? 0.9,
        targetT1: body.targetT1Microseconds ?? 100,
        targetT2: body.targetT2Microseconds ?? 80,
        minCoherence: body.minCoherence ?? 0.85,
        temperatureMin: body.temperatureMinMK ?? 10,
        temperatureMax: body.temperatureMaxMK ?? 100,
        temperatureStep: body.temperatureStepMK ?? 2,
        noiseModel: body.noiseModel ?? "thermal-bosonic",
        coolingModel: body.coolingModel ?? "carnot-approx",
        noiseParams: JSON.stringify(body.noiseParams ?? {}),
        coolingParams: JSON.stringify(body.coolingParams ?? {}),
      },
    });
    return NextResponse.json({ configuration: created });
  } catch (err: any) {
    console.error("Create configuration error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to create configuration" },
      { status: 500 },
    );
  }
}

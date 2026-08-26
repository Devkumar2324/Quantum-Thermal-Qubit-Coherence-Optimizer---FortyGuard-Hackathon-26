import { NextRequest, NextResponse } from "next/server";
import {
  runOptimization,
  OptimizationRequest,
} from "@/lib/scientific/optimizer";
import { db } from "@/lib/db";

// POST /api/optimize
// Body: OptimizationRequest
// Returns the full OptimizationResult and optionally persists it as an experiment.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as OptimizationRequest & {
      persist?: boolean;
      experimentName?: string;
    };
    if (!body.config || !body.weights) {
      return NextResponse.json(
        { error: "Missing required fields: config, weights" },
        { status: 400 },
      );
    }

    const result = runOptimization({
      config: body.config,
      ambientC: body.ambientC,
      weights: body.weights,
      minCoherence: body.minCoherence,
      durationHours: body.durationHours,
      environment: body.environment,
    });

    let experimentId: string | undefined;
    if (body.persist && db) {
      try {
        // Ensure config exists
        let configId = body.config.id;
        if (!configId) {
          const created = await db.quantumConfiguration.create({
            data: {
              name: body.config.name,
              qubitType: body.config.qubitType,
              qubitCount: body.config.qubitCount,
              qubitFrequency: body.config.qubitFrequencyGHz,
              targetCoherence: body.config.targetCoherence,
              targetT1: body.config.targetT1Microseconds,
              targetT2: body.config.targetT2Microseconds,
              minCoherence: body.config.minCoherence,
              temperatureMin: body.config.temperatureMinMK,
              temperatureMax: body.config.temperatureMaxMK,
              temperatureStep: body.config.temperatureStepMK,
              noiseParams: JSON.stringify(body.config.noiseParams),
              coolingParams: JSON.stringify(body.config.coolingParams),
            },
          });
          configId = created.id;
        }

        const exp = await db.experiment.create({
          data: {
            name: body.experimentName ?? `Experiment ${new Date().toISOString()}`,
            scenario: "custom",
            ambientTemp: body.ambientC,
            configId,
            tempMin: body.config.temperatureMinMK,
            tempMax: body.config.temperatureMaxMK,
            tempStep: body.config.temperatureStepMK,
            coherenceWeight: body.weights.coherence,
            energyWeight: body.weights.energy,
            minCoherence: body.minCoherence ?? body.config.minCoherence,
            status: result.noFeasibleSolution ? "infeasible" : "completed",
            optimalTemp: result.optimal?.temperatureMK,
            optimalCoherence: result.optimal?.coherenceScore,
            optimalEnergy: result.optimal?.energyConsumptionKWh,
            baselineEnergy: result.baseline.energyKWh,
            energySavings: result.metrics.energySavingPercent,
            paretoFrontier: JSON.stringify(result.pareto),
            sweepResults: JSON.stringify(result.sweep),
          },
        });
        experimentId = exp.id;
      } catch (dbErr) {
        // DB may not be initialized in some env; continue without persisting
        console.warn("DB persistence skipped:", dbErr);
      }
    }

    return NextResponse.json({
      ...result,
      experimentId,
    });
  } catch (err: any) {
    console.error("Optimization error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Optimization failed" },
      { status: 500 },
    );
  }
}

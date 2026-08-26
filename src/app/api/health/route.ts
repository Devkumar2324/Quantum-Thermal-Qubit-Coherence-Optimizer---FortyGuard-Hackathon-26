import { NextResponse } from "next/server";
import { getFortyGuardClient } from "@/lib/scientific/fortyguard-client";

// GET /api/health
export async function GET() {
  const client = getFortyGuardClient();
  return NextResponse.json({
    status: "ok",
    service: "quantum-thermal-coherence-optimizer",
    version: "0.2.0",
    fortyGuardAvailable: client.available,
    fortyGuardBaseUrl: client.baseUrl,
    timestamp: new Date().toISOString(),
    simulationMode: !client.available,
  });
}

import { NextResponse } from "next/server";
import { getFortyGuardClient } from "@/lib/scientific/fortyguard-client";

// GET /api/fortyguard/status
// Returns whether the FortyGuard API is configured and available.
export async function GET() {
  const client = getFortyGuardClient();
  return NextResponse.json({
    available: client.available,
    baseUrl: client.baseUrl,
    hasApiKey: Boolean(client.apiKey),
    mode: client.available ? "live" : "simulation",
  });
}

import { NextResponse } from "next/server";
import { getFortyGuardClient } from "@/lib/scientific/fortyguard-client";

// GET /api/fortyguard/credits
// Returns the current credit usage and subscription info.
export async function GET() {
  const client = getFortyGuardClient();
  if (!client.available) {
    return NextResponse.json({
      available: false,
      message: "FortyGuard API key not configured. Running in Simulation Mode.",
    });
  }
  try {
    const usage = await client.getCredits();
    return NextResponse.json({
      available: true,
      ...usage,
    });
  } catch (err: any) {
    console.error("Credits check error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch credits" },
      { status: 500 },
    );
  }
}

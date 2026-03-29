import { NextRequest, NextResponse } from "next/server";

const SERVICE_API_KEY = process.env.SERVICE_API_KEY ?? process.env.PLATFORM_C_API_KEY;

export function validateServiceAuth(req: NextRequest): NextResponse | null {
  if (!SERVICE_API_KEY) {
    console.warn("SERVICE_API_KEY not configured — s2s auth disabled in development");
    return null;
  }

  const authHeader = req.headers.get("authorization");
  const apiKey = req.headers.get("x-api-key");

  const token = apiKey ?? authHeader?.replace("Bearer ", "");

  if (!token || token !== SERVICE_API_KEY) {
    return NextResponse.json(
      { error: "Unauthorized: invalid or missing service API key" },
      { status: 401 }
    );
  }

  return null;
}

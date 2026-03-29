import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { platformCClient } from "@8gent/api-client/platform-c";

export async function GET() {
  const user = await requireUser();

  try {
    const usage = await platformCClient.metering.getUsage({
      userId: user.id,
    });
    return NextResponse.json(usage);
  } catch {
    return NextResponse.json({
      runtimeHoursUsed: 0,
      runtimeHoursLimit: 1,
      tokensByAgent: [],
      projectedUsage: 0,
      billingPeriodEnd: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
    });
  }
}

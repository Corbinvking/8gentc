import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { platformCClient } from "@8gent/api-client/platform-c";
import { getPlanLimits } from "@/lib/plans";
import type { UsageResponse } from "@8gent/api-client/platform-c";

export async function GET() {
  const user = await requireUser();

  const limits = getPlanLimits(user.plan ?? "free");

  try {
    const usage = await platformCClient.metering.getUsage({
      userId: user.id,
    });
    return NextResponse.json({
      ...usage,
      runtimeHoursLimit: limits.runtimeHoursPerMonth,
    } satisfies UsageResponse);
  } catch {
    const fallback: UsageResponse = {
      runtimeHoursUsed: 0,
      runtimeHoursLimit: limits.runtimeHoursPerMonth,
      tokensByAgent: [],
      projectedUsage: 0,
      billingPeriodEnd: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
    };
    return NextResponse.json(fallback);
  }
}

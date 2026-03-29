import { NextRequest, NextResponse } from "next/server";
import { db } from "@8gent/db/client";
import { contractors, contractorSkills } from "@8gent/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [contractor] = await db
    .select()
    .from(contractors)
    .where(eq(contractors.id, id))
    .limit(1);

  if (!contractor) {
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  }

  const skills = await db
    .select()
    .from(contractorSkills)
    .where(eq(contractorSkills.contractorId, id));

  return NextResponse.json({
    contractorId: id,
    skills: skills.map((s) => ({ category: s.category, level: s.level })),
    tier: contractor.tier,
    compositeScore: Number(contractor.compositeScore ?? 0),
  });
}

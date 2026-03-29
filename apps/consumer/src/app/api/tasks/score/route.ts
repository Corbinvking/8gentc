import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { scoreAmbition } from "@/lib/ambition-classifier";

export async function POST(req: Request) {
  await requireUser();
  const { title, description } = await req.json();

  if (!title?.trim() && !description?.trim()) {
    return NextResponse.json(
      { error: "title or description is required" },
      { status: 400 }
    );
  }

  const score = scoreAmbition(title ?? "", description ?? "");
  return NextResponse.json(score);
}

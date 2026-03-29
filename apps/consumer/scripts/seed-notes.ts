/**
 * Seed script: generates 100+ notes with 200+ cross-links for performance testing.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx apps/consumer/scripts/seed-notes.ts
 *
 * Requires a valid user and workspace in the database. Pass via env:
 *   SEED_USER_ID=...  SEED_WORKSPACE_ID=...
 *
 * Or it will attempt to use the first user/workspace found.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { notes, noteLinks, users, workspaces } from "@8gent/db/schema";
import { sql } from "drizzle-orm";

const NOTE_COUNT = 120;
const LINK_COUNT = 250;

const NOTE_TYPES = [
  "thought",
  "goal",
  "intention",
  "reference",
  "agent-output",
] as const;

const TITLES = [
  "Project roadmap",
  "Quarterly goals",
  "API design notes",
  "User research findings",
  "Architecture decisions",
  "Sprint retrospective",
  "Competitive analysis",
  "Feature brainstorm",
  "Meeting notes",
  "Technical debt log",
  "Performance benchmarks",
  "Deployment checklist",
  "Onboarding guide",
  "Security review",
  "Bug triage",
  "Data model sketch",
  "Integration plan",
  "UX feedback",
  "Cost analysis",
  "Growth strategy",
];

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomContent(): string {
  const paragraphs = Math.floor(Math.random() * 4) + 1;
  return Array.from(
    { length: paragraphs },
    () =>
      `<p>${Array.from({ length: Math.floor(Math.random() * 30) + 10 }, () => randomItem(["the", "a", "an", "this", "that", "is", "was", "will", "be", "have", "has", "do", "does", "did", "not", "but", "and", "or", "if", "then", "so", "we", "they", "it", "can", "should", "would", "could", "need", "want", "like", "use", "make", "take", "get", "go", "come", "see", "know", "think", "work", "build", "create", "design", "test", "deploy", "review", "update", "fix", "improve"])).join(" ")}.</p>`
  ).join("\n");
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  let userId = process.env.SEED_USER_ID;
  let workspaceId = process.env.SEED_WORKSPACE_ID;

  if (!userId) {
    const [first] = await db
      .select({ id: users.id })
      .from(users)
      .limit(1);
    if (!first) {
      console.error("No users found. Create a user first.");
      process.exit(1);
    }
    userId = first.id;
    console.log(`Using user: ${userId}`);
  }

  if (!workspaceId) {
    const [first] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .limit(1);
    if (!first) {
      console.error("No workspaces found. Create a workspace first.");
      process.exit(1);
    }
    workspaceId = first.id;
    console.log(`Using workspace: ${workspaceId}`);
  }

  console.log(`Seeding ${NOTE_COUNT} notes...`);

  const noteIds: string[] = [];
  for (let i = 0; i < NOTE_COUNT; i++) {
    const id = crypto.randomUUID();
    noteIds.push(id);
    await db.insert(notes).values({
      id,
      title: `${randomItem(TITLES)} #${i + 1}`,
      content: randomContent(),
      type: randomItem(NOTE_TYPES),
      workspaceId: workspaceId!,
      authorId: userId!,
    });
  }

  console.log(`Seeding ${LINK_COUNT} cross-links...`);

  const linkSet = new Set<string>();
  let created = 0;
  let attempts = 0;
  while (created < LINK_COUNT && attempts < LINK_COUNT * 3) {
    attempts++;
    const source = randomItem(noteIds);
    const target = randomItem(noteIds);
    if (source === target) continue;
    const key = `${source}:${target}`;
    if (linkSet.has(key)) continue;
    linkSet.add(key);

    await db
      .insert(noteLinks)
      .values({ sourceNoteId: source, targetNoteId: target })
      .onConflictDoNothing();
    created++;
  }

  // Circular link: A -> B -> C -> A
  if (noteIds.length >= 3) {
    const [a, b, c] = noteIds.slice(0, 3);
    for (const [s, t] of [
      [a, b],
      [b, c],
      [c, a],
    ] as [string, string][]) {
      await db
        .insert(noteLinks)
        .values({ sourceNoteId: s, targetNoteId: t })
        .onConflictDoNothing();
    }
    console.log("Added circular link: note[0] -> note[1] -> note[2] -> note[0]");
  }

  console.log(
    `Done. Created ${noteIds.length} notes and ${created} links (+ circular).`
  );

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

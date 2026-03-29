// TODO: migrate to BullMQ/pg-boss for durable scheduling when user count exceeds 500
import { db } from "../lib/db.js";
import { users, workspaces } from "@8gent/db";
import { eq } from "drizzle-orm";
import { analyzeKnowledgeGraph } from "../services/understanding-engine/analyzer.js";
import { generateOutreachItems } from "../services/understanding-engine/outreach.js";

const ANALYSIS_INTERVAL_MS = Number(process.env.UNDERSTANDING_ANALYSIS_INTERVAL_MS) || 86_400_000;

let isRunning = false;

export async function runUnderstandingAnalysis(): Promise<void> {
  if (isRunning) {
    console.log("[understanding] skipping — previous iteration still running");
    return;
  }
  isRunning = true;

  const startedAt = Date.now();
  let processed = 0;
  let errors = 0;

  try {
    const allUsers = await db.select().from(users);

    for (const user of allUsers) {
      try {
        const userWorkspaces = await db
          .select()
          .from(workspaces)
          .where(eq(workspaces.ownerId, user.id));

        for (const workspace of userWorkspaces) {
          const analysis = await analyzeKnowledgeGraph(user.id, workspace.id);
          await generateOutreachItems(analysis);
          processed++;
        }
      } catch (err) {
        errors++;
        console.error(`Understanding analysis failed for user ${user.id}:`, err);
      }
    }
  } finally {
    isRunning = false;
    const durationMs = Date.now() - startedAt;
    console.log(
      JSON.stringify({
        worker: "understanding",
        startedAt: new Date(startedAt).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs,
        itemsProcessed: processed,
        errors,
      })
    );
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startUnderstandingWorker(): void {
  timer = setInterval(() => {
    runUnderstandingAnalysis().catch(console.error);
  }, ANALYSIS_INTERVAL_MS);
}

export function stopUnderstandingWorker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

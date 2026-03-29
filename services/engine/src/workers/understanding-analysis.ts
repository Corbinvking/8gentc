import { db } from "../lib/db.js";
import { users, workspaces } from "@8gent/db";
import { eq } from "drizzle-orm";
import { analyzeKnowledgeGraph } from "../services/understanding-engine/analyzer.js";
import { generateOutreachItems } from "../services/understanding-engine/outreach.js";

const ANALYSIS_INTERVAL_MS = Number(process.env.UNDERSTANDING_ANALYSIS_INTERVAL_MS) || 86_400_000;

export async function runUnderstandingAnalysis(): Promise<void> {
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
      }
    } catch (err) {
      console.error(`Understanding analysis failed for user ${user.id}:`, err);
    }
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

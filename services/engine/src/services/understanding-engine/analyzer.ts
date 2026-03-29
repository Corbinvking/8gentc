import { callLLM } from "../../lib/llm-client.js";
import { db } from "../../lib/db.js";
import { notes, agents } from "@8gent/db";
import { eq } from "drizzle-orm";

export interface AnalysisResult {
  userId: string;
  goalCompleteness: GoalCheck[];
  extractedIntentions: Intention[];
  contradictions: Contradiction[];
  connections: Connection[];
  progressUpdates: ProgressUpdate[];
}

interface GoalCheck {
  noteId: string;
  goalText: string;
  hasActionPlan: boolean;
  isStale: boolean;
}

interface Intention {
  sourceNoteId: string;
  intentionText: string;
  confidence: number;
}

interface Contradiction {
  noteIdA: string;
  noteIdB: string;
  description: string;
}

interface Connection {
  noteIdA: string;
  noteIdB: string;
  relationship: string;
  strength: number;
}

interface ProgressUpdate {
  goalNoteId: string;
  progressDescription: string;
  percentComplete: number;
}

export async function analyzeKnowledgeGraph(
  userId: string,
  workspaceId: string
): Promise<AnalysisResult> {
  const userNotes = await db
    .select()
    .from(notes)
    .where(eq(notes.workspaceId, workspaceId));

  const userAgents = await db
    .select()
    .from(agents)
    .where(eq(agents.ownerId, userId));

  if (userNotes.length === 0) {
    return {
      userId,
      goalCompleteness: [],
      extractedIntentions: [],
      contradictions: [],
      connections: [],
      progressUpdates: [],
    };
  }

  const noteSummaries = userNotes
    .map((n) => `[${n.id}] ${n.title}: ${(n.content ?? "").slice(0, 200)}`)
    .join("\n");

  const agentSummaries = userAgents
    .map((a) => `Agent "${a.name}" (${a.status}): skills=${JSON.stringify(a.skills)}`)
    .join("\n");

  const prompt = `Analyze the following knowledge graph for user patterns.

Notes:
${noteSummaries}

Active agents:
${agentSummaries}

Return a JSON object with these fields:
- goalCompleteness: array of {noteId, goalText, hasActionPlan (bool), isStale (bool)}
- extractedIntentions: array of {sourceNoteId, intentionText, confidence (0-1)}
- contradictions: array of {noteIdA, noteIdB, description}
- connections: array of {noteIdA, noteIdB, relationship, strength (0-1)}
- progressUpdates: array of {goalNoteId, progressDescription, percentComplete (0-100)}

Only return valid JSON.`;

  try {
    const result = await callLLM({
      prompt,
      taskType: "analysis",
      userId,
      systemPrompt: "You are a knowledge graph analyst. Return only valid JSON, no markdown.",
      temperature: 0.3,
    });

    const parsed = JSON.parse(result.response);
    return { userId, ...parsed };
  } catch {
    return {
      userId,
      goalCompleteness: [],
      extractedIntentions: [],
      contradictions: [],
      connections: [],
      progressUpdates: [],
    };
  }
}

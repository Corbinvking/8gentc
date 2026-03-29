import { nanoid } from "nanoid";
import { db } from "../../lib/db.js";
import { understandingItems } from "@8gent/db";
import { eq, and, gte } from "drizzle-orm";
import type { AnalysisResult } from "./analyzer.js";
import type { UnderstandingItemType, UnderstandingPriority } from "@8gent/shared";

const MAX_ITEMS_PER_DAY = 5;

export interface OutreachItem {
  id: string;
  userId: string;
  type: UnderstandingItemType;
  priority: UnderstandingPriority;
  relevantNotes: string[];
  suggestedAction: string;
  expiresAt: Date;
}

export async function generateOutreachItems(
  analysis: AnalysisResult
): Promise<OutreachItem[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingToday = await db
    .select()
    .from(understandingItems)
    .where(
      and(
        eq(understandingItems.userId, analysis.userId),
        gte(understandingItems.createdAt, today)
      )
    );

  const remaining = MAX_ITEMS_PER_DAY - existingToday.length;
  if (remaining <= 0) return [];

  const items: OutreachItem[] = [];
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  for (const goal of analysis.goalCompleteness) {
    if (items.length >= remaining) break;
    if (goal.isStale) {
      items.push({
        id: nanoid(),
        userId: analysis.userId,
        type: "question",
        priority: "medium",
        relevantNotes: [goal.noteId],
        suggestedAction: `Your goal "${goal.goalText}" seems stale. Would you like to update it or mark it complete?`,
        expiresAt,
      });
    }
    if (!goal.hasActionPlan) {
      items.push({
        id: nanoid(),
        userId: analysis.userId,
        type: "suggestion",
        priority: "high",
        relevantNotes: [goal.noteId],
        suggestedAction: `Goal "${goal.goalText}" doesn't have an action plan yet. Want me to help create one?`,
        expiresAt,
      });
    }
  }

  for (const intention of analysis.extractedIntentions) {
    if (items.length >= remaining) break;
    if (intention.confidence > 0.7) {
      items.push({
        id: nanoid(),
        userId: analysis.userId,
        type: "goal_detected",
        priority: "medium",
        relevantNotes: [intention.sourceNoteId],
        suggestedAction: `I noticed a potential goal: "${intention.intentionText}". Would you like to formalize it?`,
        expiresAt,
      });
    }
  }

  for (const contradiction of analysis.contradictions) {
    if (items.length >= remaining) break;
    items.push({
      id: nanoid(),
      userId: analysis.userId,
      type: "contradiction",
      priority: "high",
      relevantNotes: [contradiction.noteIdA, contradiction.noteIdB],
      suggestedAction: `Potential contradiction found: ${contradiction.description}`,
      expiresAt,
    });
  }

  for (const connection of analysis.connections) {
    if (items.length >= remaining) break;
    if (connection.strength > 0.8) {
      items.push({
        id: nanoid(),
        userId: analysis.userId,
        type: "idea",
        priority: "low",
        relevantNotes: [connection.noteIdA, connection.noteIdB],
        suggestedAction: `I found a connection: ${connection.relationship}`,
        expiresAt,
      });
    }
  }

  if (items.length > 0) {
    await db.insert(understandingItems).values(
      items.map((item) => ({
        id: item.id,
        userId: item.userId,
        type: item.type,
        priority: item.priority,
        relevantNotes: item.relevantNotes,
        suggestedAction: item.suggestedAction,
        expiresAt: item.expiresAt,
        status: "pending" as const,
      }))
    );
  }

  return items;
}

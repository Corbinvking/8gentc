"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { submitAssessmentTask } from "@/lib/actions/assessment";
import { toast } from "sonner";
import { Clock, CheckCircle2 } from "lucide-react";

interface AssessmentTask {
  id: string;
  type: "development" | "content_creation" | "research";
  title: string;
  description: string;
  prompt: string;
  timeLimit: number;
}

const ASSESSMENT_TASKS: AssessmentTask[] = [
  {
    id: "coding-1",
    type: "development",
    title: "Coding Task",
    description:
      "Write a prompt to generate a TypeScript function that validates email addresses using regex. The function should handle edge cases and return a typed result object.",
    prompt: "Write a prompt that instructs an AI to generate a robust email validation function in TypeScript.",
    timeLimit: 600,
  },
  {
    id: "content-1",
    type: "content_creation",
    title: "Content Task",
    description:
      "Write a prompt to generate a professional blog post introduction about the impact of AI on software development workflows.",
    prompt: "Write a prompt for generating a blog post introduction about AI in software development.",
    timeLimit: 480,
  },
  {
    id: "research-1",
    type: "research",
    title: "Research Task",
    description:
      "Write a prompt to research and summarize the top 3 approaches to implementing rate limiting in distributed systems, with pros and cons for each.",
    prompt: "Write a research prompt about rate limiting approaches in distributed systems.",
    timeLimit: 720,
  },
];

export default function AssessmentPage() {
  const router = useRouter();
  const [currentTask, setCurrentTask] = useState(0);
  const [response, setResponse] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(ASSESSMENT_TASKS[0].timeLimit);
  const [taskStartTime, setTaskStartTime] = useState(Date.now());
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const task = ASSESSMENT_TASKS[currentTask];

  const handleTimeUp = useCallback(async () => {
    await handleSubmitTask();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentTask, handleTimeUp]);

  async function handleSubmitTask() {
    if (submitting) return;
    setSubmitting(true);
    const timeTaken = Math.floor((Date.now() - taskStartTime) / 1000);

    try {
      await submitAssessmentTask({
        taskType: task.type,
        prompt: task.prompt,
        response,
        timeTaken,
        timeLimit: task.timeLimit,
      });

      setCompletedTasks((prev) => [...prev, task.id]);

      if (currentTask < ASSESSMENT_TASKS.length - 1) {
        const nextTask = currentTask + 1;
        setCurrentTask(nextTask);
        setResponse("");
        setTimeRemaining(ASSESSMENT_TASKS[nextTask].timeLimit);
        setTaskStartTime(Date.now());
      } else {
        toast.success("Assessment complete! Your results are being reviewed.");
        router.push("/onboarding/status");
      }
    } catch {
      toast.error("Failed to submit task. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Skills Assessment</h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Task {currentTask + 1} of {ASSESSMENT_TASKS.length}
          </p>
        </div>
        <div
          className={`flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-lg font-bold ${
            timeRemaining < 60
              ? "bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]"
              : "bg-[var(--color-muted)] text-[var(--color-foreground)]"
          }`}
        >
          <Clock className="h-5 w-5" />
          {formatTime(timeRemaining)}
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {ASSESSMENT_TASKS.map((t, i) => (
          <div
            key={t.id}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
              completedTasks.includes(t.id)
                ? "bg-[var(--color-success)] text-white"
                : i === currentTask
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                  : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
            }`}
          >
            {completedTasks.includes(t.id) ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
          </div>
        ))}
      </div>

      <div className="mb-6 rounded-lg bg-[var(--color-muted)] p-4">
        <h3 className="mb-1 font-semibold">{task.title}</h3>
        <p className="text-sm text-[var(--color-muted-foreground)]">{task.description}</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Your Response</label>
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          rows={10}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
          placeholder="Write your prompt/response here..."
        />
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          {response.length} characters · ~{Math.ceil(response.length / 4)} tokens
        </p>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleSubmitTask}
          disabled={submitting || !response.trim()}
          className="rounded-lg bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
        >
          {submitting
            ? "Submitting..."
            : currentTask < ASSESSMENT_TASKS.length - 1
              ? "Submit & Next"
              : "Submit & Finish"}
        </button>
      </div>
    </div>
  );
}

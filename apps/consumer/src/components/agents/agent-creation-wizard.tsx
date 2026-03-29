"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateAgent } from "@/hooks/use-agents";
import { Bot, Search, ShoppingCart, Wrench, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const agentTemplates = [
  {
    id: "acquisition",
    name: "Client Acquisition",
    description: "Finds and qualifies potential clients based on your criteria",
    icon: ShoppingCart,
  },
  {
    id: "research",
    name: "Research Agent",
    description: "Continuously monitors topics and surfaces relevant findings",
    icon: Search,
  },
  {
    id: "assistant",
    name: "Personal Assistant",
    description: "Handles daily tasks, reminders, and routine operations",
    icon: Bot,
  },
  {
    id: "custom",
    name: "Custom Agent",
    description: "Build an agent with custom skills and configuration",
    icon: Wrench,
  },
];

type Step = "template" | "configure" | "activate";

export function AgentCreationWizard() {
  const [step, setStep] = useState<Step>("template");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const createAgent = useCreateAgent();
  const router = useRouter();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name for your agent");
      return;
    }

    try {
      await createAgent.mutateAsync({
        name: name.trim(),
        ownerId: "",
        skills,
        config: { template: selectedTemplate },
      });
      toast.success("Agent created!");
      router.push("/agents");
    } catch {
      toast.error("Failed to create agent");
    }
  };

  const addSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setNewSkill("");
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center gap-4 text-sm">
        {(["template", "configure", "activate"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
                step === s
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
              )}
            >
              {i + 1}
            </div>
            <span
              className={cn(
                "capitalize",
                step === s ? "font-medium" : "text-zinc-400"
              )}
            >
              {s}
            </span>
            {i < 2 && (
              <ArrowRight className="h-4 w-4 text-zinc-300 dark:text-zinc-700" />
            )}
          </div>
        ))}
      </div>

      {step === "template" && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Choose a template</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {agentTemplates.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTemplate(t.id);
                  setName(t.name);
                  setStep("configure");
                }}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900",
                  selectedTemplate === t.id
                    ? "border-zinc-900 dark:border-zinc-100"
                    : "border-zinc-200 dark:border-zinc-800"
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <t.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">{t.name}</h3>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    {t.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "configure" && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Configure your agent</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Skills</label>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs dark:bg-zinc-800"
                  >
                    {skill}
                    <button
                      onClick={() =>
                        setSkills(skills.filter((s) => s !== skill))
                      }
                      className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                  placeholder="Add a skill..."
                  className="h-9 flex-1 rounded-md border border-zinc-200 bg-white px-3 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
                />
                <button
                  onClick={addSkill}
                  className="h-9 rounded-md border border-zinc-200 px-3 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setStep("template")}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={() => setStep("activate")}
              className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === "activate" && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Ready to activate</h2>
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Template</dt>
                <dd className="font-medium capitalize">{selectedTemplate}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Name</dt>
                <dd className="font-medium">{name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Skills</dt>
                <dd className="font-medium">{skills.length}</dd>
              </div>
            </dl>
          </div>
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setStep("configure")}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={createAgent.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {createAgent.isPending ? "Creating..." : "Activate Agent"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

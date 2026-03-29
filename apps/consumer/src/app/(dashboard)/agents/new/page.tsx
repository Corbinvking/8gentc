import { AgentCreationWizard } from "@/components/agents/agent-creation-wizard";

export default function NewAgentPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Create Agent</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Configure a new agent to work on your behalf
      </p>
      <div className="mt-8">
        <AgentCreationWizard />
      </div>
    </div>
  );
}

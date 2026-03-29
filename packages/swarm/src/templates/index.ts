export interface SwarmRole {
  id: string;
  name: string;
  description: string;
  skills: string[];
  modelPreference?: string;
}

export interface SwarmWorkflowStep {
  roleId: string;
  dependsOn: string[];
  parallel?: boolean;
}

export interface SwarmTemplate {
  id: string;
  name: string;
  description: string;
  roles: SwarmRole[];
  workflow: SwarmWorkflowStep[];
}

export const SWARM_TEMPLATES: SwarmTemplate[] = [
  {
    id: "software-dev",
    name: "Software Development",
    description: "Full software development lifecycle with architect, developer, reviewer, and tester",
    roles: [
      {
        id: "architect",
        name: "Architect",
        description: "Designs system architecture and technical specifications",
        skills: ["code-execution", "file-read"],
        modelPreference: "complex",
      },
      {
        id: "developer",
        name: "Developer",
        description: "Implements the code according to architectural specifications",
        skills: ["code-execution", "file-read", "web-search"],
      },
      {
        id: "reviewer",
        name: "Code Reviewer",
        description: "Reviews code for quality, security, and adherence to specs",
        skills: ["code-execution", "file-read"],
      },
      {
        id: "tester",
        name: "Tester",
        description: "Writes and runs tests to verify implementation",
        skills: ["code-execution", "file-read"],
      },
    ],
    workflow: [
      { roleId: "architect", dependsOn: [] },
      { roleId: "developer", dependsOn: ["architect"] },
      { roleId: "reviewer", dependsOn: ["developer"] },
      { roleId: "tester", dependsOn: ["developer"], parallel: true },
    ],
  },
  {
    id: "content",
    name: "Content Creation",
    description: "Content pipeline with strategist, writer, editor, and designer",
    roles: [
      {
        id: "strategist",
        name: "Content Strategist",
        description: "Defines content strategy, topics, and target audience",
        skills: ["web-search", "summarize"],
        modelPreference: "complex",
      },
      {
        id: "writer",
        name: "Writer",
        description: "Creates content drafts based on the strategy",
        skills: ["web-search", "summarize"],
      },
      {
        id: "editor",
        name: "Editor",
        description: "Reviews and polishes written content",
        skills: ["summarize"],
      },
      {
        id: "designer",
        name: "Designer",
        description: "Creates visual assets and layout for content",
        skills: ["web-search"],
      },
    ],
    workflow: [
      { roleId: "strategist", dependsOn: [] },
      { roleId: "writer", dependsOn: ["strategist"] },
      { roleId: "editor", dependsOn: ["writer"] },
      { roleId: "designer", dependsOn: ["strategist"], parallel: true },
    ],
  },
  {
    id: "research",
    name: "Research",
    description: "Research pipeline with scout, analyst, synthesizer, and reviewer",
    roles: [
      {
        id: "scout",
        name: "Research Scout",
        description: "Searches for and collects relevant sources and data",
        skills: ["web-search", "file-read"],
      },
      {
        id: "analyst",
        name: "Analyst",
        description: "Analyzes collected data for patterns and insights",
        skills: ["summarize", "web-search"],
        modelPreference: "complex",
      },
      {
        id: "synthesizer",
        name: "Synthesizer",
        description: "Combines analysis into coherent findings and recommendations",
        skills: ["summarize"],
        modelPreference: "complex",
      },
      {
        id: "reviewer",
        name: "Peer Reviewer",
        description: "Validates methodology and conclusions",
        skills: ["web-search", "summarize"],
      },
    ],
    workflow: [
      { roleId: "scout", dependsOn: [] },
      { roleId: "analyst", dependsOn: ["scout"] },
      { roleId: "synthesizer", dependsOn: ["analyst"] },
      { roleId: "reviewer", dependsOn: ["synthesizer"] },
    ],
  },
  {
    id: "consulting",
    name: "Consulting",
    description: "Consulting engagement with analyst, strategist, and recommender",
    roles: [
      {
        id: "analyst",
        name: "Business Analyst",
        description: "Analyzes the business context and identifies challenges",
        skills: ["web-search", "summarize"],
      },
      {
        id: "strategist",
        name: "Strategy Consultant",
        description: "Develops strategic options and evaluates trade-offs",
        skills: ["web-search", "summarize"],
        modelPreference: "complex",
      },
      {
        id: "recommender",
        name: "Recommender",
        description: "Produces final recommendations with implementation roadmap",
        skills: ["summarize"],
        modelPreference: "complex",
      },
    ],
    workflow: [
      { roleId: "analyst", dependsOn: [] },
      { roleId: "strategist", dependsOn: ["analyst"] },
      { roleId: "recommender", dependsOn: ["strategist"] },
    ],
  },
];

export function getTemplate(templateId: string): SwarmTemplate | undefined {
  return SWARM_TEMPLATES.find((t) => t.id === templateId);
}

export function listTemplates(): SwarmTemplate[] {
  return SWARM_TEMPLATES;
}

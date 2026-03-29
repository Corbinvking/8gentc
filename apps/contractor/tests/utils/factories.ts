import { nanoid } from "nanoid";

export function createContractor(overrides: Record<string, unknown> = {}) {
  return {
    id: nanoid(),
    userId: `user_${nanoid(8)}`,
    displayName: "Test Contractor",
    skills: ["development"],
    rating: "4.50",
    completedTasks: 10,
    status: "active",
    tier: "new",
    bio: "Test bio",
    timezone: "America/New_York",
    location: "New York, US",
    availabilityPreference: "flexible",
    onboardingStatus: "approved",
    assessmentScore: "72.50",
    compositeScore: "75.00",
    xp: 500,
    currentStreak: 5,
    stripeConnectId: null,
    contractorAgreementSignedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTaskOffer(overrides: Record<string, unknown> = {}) {
  return {
    id: nanoid(),
    taskId: `task_${nanoid(8)}`,
    contractorId: `contractor_${nanoid(8)}`,
    title: "Test Task",
    description: "Test task description",
    category: "development",
    complexity: 3,
    harnessType: "coding",
    estimatedDuration: 60,
    payoutMin: "25.00",
    payoutMax: "100.00",
    deadline: null,
    clientContextSummary: "Test context",
    status: "pending",
    offeredAt: new Date(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    respondedAt: null,
    rejectionReason: null,
    ...overrides,
  };
}

export function createShift(overrides: Record<string, unknown> = {}) {
  const start = new Date();
  start.setHours(start.getHours() + 1);
  const end = new Date(start);
  end.setHours(end.getHours() + 4);

  return {
    id: nanoid(),
    contractorId: `contractor_${nanoid(8)}`,
    startTime: start,
    endTime: end,
    type: "one_off",
    status: "scheduled",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createDeliverable(overrides: Record<string, unknown> = {}) {
  return {
    id: nanoid(),
    taskId: `task_${nanoid(8)}`,
    contractorId: `contractor_${nanoid(8)}`,
    content: "Deliverable content",
    fileUrls: [],
    revisionOf: null,
    revisionNumber: 0,
    status: "submitted",
    submittedAt: new Date(),
    ...overrides,
  };
}

export function createPayout(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - 7);

  return {
    id: nanoid(),
    contractorId: `contractor_${nanoid(8)}`,
    amount: "150.00",
    baseAmount: "125.00",
    performanceMultiplier: "1.10",
    efficiencyBonus: "12.50",
    status: "pending",
    stripePayoutId: null,
    stripeTransferId: null,
    periodStart,
    periodEnd: now,
    processedAt: null,
    createdAt: now,
    ...overrides,
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  plan: UserPlan;
  createdAt: Date;
  updatedAt: Date;
}

export type UserPlan = "free" | "pro" | "enterprise";

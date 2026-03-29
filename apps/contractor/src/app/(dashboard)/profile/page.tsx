import { requireContractor } from "@/lib/auth";
import { db } from "@8gent/db/client";
import { contractorProfiles, contractorSkills, contractorAchievements, achievements } from "@8gent/db/schema";
import { eq } from "drizzle-orm";
import { User, MapPin, Clock, Award, Briefcase } from "lucide-react";

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: "Tier 1 — New", color: "bg-gray-500" },
  established: { label: "Tier 2 — Established", color: "bg-blue-500" },
  expert: { label: "Tier 3 — Expert", color: "bg-purple-500" },
  elite: { label: "Tier 4 — Elite", color: "bg-amber-500" },
};

export default async function ProfilePage() {
  const contractor = await requireContractor();

  const [profile] = await db
    .select()
    .from(contractorProfiles)
    .where(eq(contractorProfiles.contractorId, contractor.id))
    .limit(1);

  const skills = await db
    .select()
    .from(contractorSkills)
    .where(eq(contractorSkills.contractorId, contractor.id));

  const earned = await db
    .select({ achievement: achievements, earnedAt: contractorAchievements.earnedAt })
    .from(contractorAchievements)
    .innerJoin(achievements, eq(contractorAchievements.achievementId, achievements.id))
    .where(eq(contractorAchievements.contractorId, contractor.id));

  const tierConfig = TIER_CONFIG[contractor.tier] ?? TIER_CONFIG.new;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <div className="flex items-start gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-muted)]">
            <User className="h-10 w-10 text-[var(--color-muted-foreground)]" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{contractor.displayName}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-[var(--color-muted-foreground)]">
              <span className={`rounded-full ${tierConfig.color} px-3 py-0.5 text-xs font-medium text-white`}>
                {tierConfig.label}
              </span>
              {contractor.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {contractor.location}
                </span>
              )}
              {contractor.timezone && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {contractor.timezone}
                </span>
              )}
            </div>
            {contractor.bio && <p className="mt-3 text-sm">{contractor.bio}</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <Briefcase className="h-4 w-4" /> Skills
          </h3>
          {skills.length > 0 ? (
            <div className="space-y-3">
              {skills.map((skill) => (
                <div key={skill.id} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{skill.category.replace("_", " ")}</span>
                  <span className="rounded-full bg-[var(--color-muted)] px-3 py-0.5 text-xs font-medium capitalize">
                    {skill.level}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">No skills added yet.</p>
          )}
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
          <h3 className="mb-4 font-semibold">Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold">{contractor.completedTasks ?? 0}</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">Tasks Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {contractor.compositeScore ? Number(contractor.compositeScore).toFixed(1) : "—"}
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]">Composite Score</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{contractor.xp.toLocaleString()}</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">Total XP</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{contractor.currentStreak}</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">Current Streak</p>
            </div>
          </div>
        </div>
      </div>

      {profile?.portfolioLinks && profile.portfolioLinks.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
          <h3 className="mb-4 font-semibold">Portfolio</h3>
          <div className="space-y-2">
            {profile.portfolioLinks.map((link, i) => (
              <a
                key={i}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-[var(--color-primary)] hover:underline"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      )}

      {earned.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <Award className="h-4 w-4" /> Achievements
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {earned.map((item) => (
              <div
                key={item.achievement.id}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-3"
              >
                <p className="font-medium text-sm">{item.achievement.name}</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">{item.achievement.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

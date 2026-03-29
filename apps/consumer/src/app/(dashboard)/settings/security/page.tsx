import { UserProfile } from "@clerk/nextjs";

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Security</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Manage your password, two-factor authentication, and sessions
      </p>
      <div className="mt-8">
        <UserProfile
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-none border border-zinc-200 dark:border-zinc-800",
            },
          }}
        />
      </div>
    </div>
  );
}

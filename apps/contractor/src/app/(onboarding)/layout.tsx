export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-background)] p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">8gent</h1>
        <p className="mt-1 text-[var(--color-muted-foreground)]">Contractor Onboarding</p>
      </div>
      <div className="w-full max-w-2xl">{children}</div>
    </div>
  );
}

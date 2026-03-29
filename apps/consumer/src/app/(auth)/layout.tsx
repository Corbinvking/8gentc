export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">8gent</h1>
          <p className="mt-2 text-sm text-zinc-500">
            AI-powered knowledge workspace
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "8gent — AI Agent Workspace",
  description: "The leading agentic ecosystem for individuals and enterprises.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

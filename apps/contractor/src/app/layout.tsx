import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "8gent — Contractor Platform",
  description: "Task marketplace for the world's largest AI-native contractor fleet.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "8gent — Admin Dashboard",
  description: "Internal operations dashboard for 8gent.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

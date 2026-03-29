import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "8gent — Admin Dashboard",
  description: "Internal operations dashboard for 8gent.",
};

function Nav() {
  return (
    <nav className="border-b border-gray-800 bg-gray-950 px-6 py-3">
      <div className="max-w-6xl mx-auto flex items-center gap-6">
        <Link href="/" className="font-bold text-white text-lg">8gent Ops</Link>
        <Link href="/health" className="text-gray-400 hover:text-white text-sm">Health</Link>
        <Link href="/financials" className="text-gray-400 hover:text-white text-sm">Financials</Link>
        <Link href="/workforce" className="text-gray-400 hover:text-white text-sm">Workforce</Link>
        <Link href="/clients" className="text-gray-400 hover:text-white text-sm">Clients</Link>
      </div>
    </nav>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950">
        <Nav />
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Email Automation Platform",
  description: "Cold Email & Referral Outreach Automation Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        {/* ── Navigation ──────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl">
          <nav className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            {/* Brand */}
            <a href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-glow-violet transition-transform group-hover:scale-105">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-sm font-semibold text-zinc-100 tracking-tight">
                OutreachOS
              </span>
            </a>

            {/* Links */}
            <div className="flex items-center gap-1">
              <NavLink href="/campaigns">Campaigns</NavLink>
              <NavLink href="/campaigns/new">New Campaign</NavLink>
              <NavLink href="/resume-library">Resume Library</NavLink>
            </div>
          </nav>
        </header>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main className="max-w-6xl mx-auto px-6 py-8 animate-fade-in">
          {children}
        </main>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="relative px-3 py-1.5 text-sm text-zinc-400 rounded-md transition-all duration-150 hover:text-zinc-100 hover:bg-white/[0.06] active:scale-[0.97]"
    >
      {children}
    </a>
  );
}

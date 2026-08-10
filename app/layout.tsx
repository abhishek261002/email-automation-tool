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
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <nav className="border-b px-6 py-3 flex items-center gap-6">
          <a href="/" className="font-semibold text-lg">
            Email Automation
          </a>
          <a href="/campaigns" className="text-sm hover:underline">
            Campaigns
          </a>
          <a href="/campaigns/new" className="text-sm hover:underline">
            New Campaign
          </a>
          <a href="/resume-library" className="text-sm hover:underline">
            Resume Library
          </a>
        </nav>
        <main className="px-6 py-8">{children}</main>
      </body>
    </html>
  );
}

import Link from "next/link";
import EmailProcessAnimation from "./components/EmailProcessAnimation";

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-start text-center px-4 pt-20 pb-28 overflow-hidden selection:bg-zinc-800 selection:text-zinc-100">
      {/* Subtle modern grid pattern */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" 
      />

      {/* Top subtle spotlight glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -z-10 -translate-x-1/2 h-[380px] w-[700px] rounded-full bg-gradient-to-b from-violet-500/10 via-zinc-500/5 to-transparent blur-[120px]"
      />

      {/* --- HERO SECTION --- */}
      <section className="flex flex-col items-center justify-center max-w-4xl mx-auto">
        {/* Badge */}
        <div className="group mb-8 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 backdrop-blur-md text-zinc-300 text-xs font-medium tracking-wide shadow-sm hover:border-zinc-700 transition-colors duration-200">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-zinc-200">Outreach Engine</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-400 font-mono">Automated Pipeline</span>
        </div>

        {/* Heading */}
        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
          Cold Email &amp;{" "}
          <span className="bg-gradient-to-b from-zinc-100 via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
            Referral Outreach
          </span>
        </h1>

        {/* Subheading */}
        <p className="max-w-xl text-zinc-400 text-base sm:text-lg leading-relaxed mb-10 font-normal">
          Automate personalized cold email campaigns for job referral outreach.
          Parse Apollo.io data, review verified leads, and dispatch emails with safe rate limiting.
        </p>

        {/* CTAs */}
        <div className="flex items-center gap-3.5 flex-wrap justify-center">
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-100 text-zinc-900 text-sm font-semibold hover:bg-white shadow-[0_1px_2px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.1)_inset] transition-all duration-150 active:scale-[0.98]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            New Campaign
          </Link>
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-300 text-sm font-medium hover:bg-zinc-800/80 hover:text-white hover:border-zinc-700 transition-all duration-150 active:scale-[0.98]"
          >
            View Campaigns
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>

        {/* Feature pills */}
        <div className="mt-14 flex flex-wrap justify-center gap-2.5 max-w-2xl">
          {[
            "Apollo.io parsing",
            "Contextual personalization",
            "Rate-limited dispatch",
            "Bounce detection",
            "Live tracking",
          ].map((f) => (
            <span
              key={f}
              className="flex items-center gap-2 px-3 py-1 rounded-md border border-zinc-800/80 bg-zinc-900/40 text-xs font-mono text-zinc-400 hover:text-zinc-300 hover:border-zinc-700/60 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              {f}
            </span>
          ))}
        </div>
      </section>

      {/* --- INTERACTIVE ANIMATION PIPELINE SECTION --- */}
      <section className="w-full max-w-5xl mt-24 text-left">
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            Pipeline Architecture
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
        </div>

        <EmailProcessAnimation />
      </section>
    </div>
  );
}
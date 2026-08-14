"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  FileSpreadsheet,
  Cpu,
  MailCheck,
  Send,
  ShieldCheck,
  BarChart3,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Flame,
  Terminal,
  Wifi,
  Zap,
  CircleDot,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
interface StepConfig {
  id: number;
  title: string;
  tagline: string;
  badge: string;
  icon: React.ElementType;
  description: string;
  metrics: { label: string; value: string }[];
  visualType: "parse" | "template" | "dispatch" | "telemetry";
}

/* ─────────────────────────────────────────────────────────────
   STEP DATA
───────────────────────────────────────────────────────────── */
const STEPS: StepConfig[] = [
  {
    id: 1,
    title: "AI Extraction & Ingestion",
    tagline: "Gemini AI structuring recipient leads from raw sheets & data",
    badge: "Step 01 • Ingestion",
    icon: Sparkles,
    description:
      "Raw recipient contacts, hiring leads, and spreadsheet data are parsed and validated automatically through Gemini AI.",
    metrics: [
      { label: "Extraction Speed", value: "< 1.2s" },
      { label: "Data Accuracy", value: "99.8%" },
    ],
    visualType: "parse",
  },
  {
    id: 2,
    title: "Contextual Synthesis",
    tagline: "Dynamic template matching & custom resume embedding",
    badge: "Step 02 • Synthesis",
    icon: Cpu,
    description:
      "Liquid templates resolve dynamic tags ({{company}}, {{role}}) and map matched resumes into hyper-personalized draft bodies.",
    metrics: [
      { label: "Tag Resolution", value: "Realtime" },
      { label: "Variants", value: "100% Unique" },
    ],
    visualType: "template",
  },
  {
    id: 3,
    title: "Rate-Limited Dispatch",
    tagline: "Controlled cron execution via direct Gmail API integration",
    badge: "Step 03 • Dispatch",
    icon: Send,
    description:
      "Automated queue batches deliver emails in steady, randomized intervals to safeguard domain health and bypass spam filters.",
    metrics: [
      { label: "Jitter Interval", value: "15s – 45s" },
      { label: "Deliverability", value: "High In-box" },
    ],
    visualType: "dispatch",
  },
  {
    id: 4,
    title: "Telemetry & Bounce Guard",
    tagline: "Automated status logs, retry management & bounce tracking",
    badge: "Step 04 • Telemetry",
    icon: ShieldCheck,
    description:
      "Live status telemetry tracks delivery receipts, detects bounce notices, and updates campaign metrics on the fly.",
    metrics: [
      { label: "Bounce Detector", value: "Active" },
      { label: "Log Latency", value: "< 200ms" },
    ],
    visualType: "telemetry",
  },
];

const STEP_DURATION_MS = 5000;
const TICK_MS = 50;

/* ─────────────────────────────────────────────────────────────
   HOOK – animated counter
───────────────────────────────────────────────────────────── */
function useAnimatedCounter(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setValue(Math.floor(start));
      if (start >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

/* ─────────────────────────────────────────────────────────────
   HOOK – typewriter
───────────────────────────────────────────────────────────── */
function useTypewriter(text: string, speed = 28, deps: unknown[] = []) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const t = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(t);
    }, speed);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return displayed;
}

/* ─────────────────────────────────────────────────────────────
   VISUAL 1 – Parse
───────────────────────────────────────────────────────────── */
const parseRows = [
  { email: "alex.turner@techcorp.io", role: "Engineering VP" },
  { email: "sarah.c@cloudscale.ai", role: "CTO" },
  { email: "devon.m@venturelab.co", role: "Hiring Manager" },
  { email: "priya.n@buildfast.dev", role: "Tech Lead" },
];

function ParseVisual() {
  const [activeRow, setActiveRow] = useState(1);
  const [scanLine, setScanLine] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setScanLine((p) => (p + 1) % 100), 40);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(
      () => setActiveRow((p) => (p + 1) % parseRows.length),
      1100
    );
    return () => clearInterval(t);
  }, []);

  const typed = useTypewriter(parseRows[activeRow].email, 30, [activeRow]);

  return (
    <div className="space-y-2.5 relative z-10">
      <div className="flex items-center justify-between text-[11px] font-mono text-white/40 pb-2.5 border-b border-white/10">
        <span className="flex items-center gap-1.5 text-white/70">
          <FileSpreadsheet className="w-3.5 h-3.5" />
          input_contacts.csv
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-white"
            style={{ animation: "bwPing 1s ease-in-out infinite" }}
          />
          Gemini parsing…
        </span>
      </div>

      <div className="relative overflow-hidden rounded-lg">
        {/* scan line */}
        <div
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none z-20"
          style={{ top: `${scanLine}%` }}
        />
        <div className="space-y-1.5">
          {parseRows.map((row, i) => {
            const isCurrent = i === activeRow;
            const isDone = i < activeRow;
            return (
              <div
                key={row.email}
                className={`relative flex items-center justify-between px-3 py-2 rounded-lg font-mono text-[11px] border transition-all duration-300 ${
                  isCurrent
                    ? "bg-white/10 border-white/30 shadow-[0_0_16px_rgba(255,255,255,0.07)]"
                    : isDone
                    ? "bg-white/[0.03] border-white/10 opacity-70"
                    : "bg-transparent border-white/[0.04] opacity-30"
                }`}
              >
                <span className={isCurrent ? "text-white" : isDone ? "text-white/50" : "text-white/20"}>
                  {isCurrent ? typed : row.email}
                  {isCurrent && typed.length < row.email.length && (
                    <span className="ml-0.5 inline-block w-px h-3 bg-white align-middle animate-pulse" />
                  )}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    isCurrent
                      ? "bg-white/10 text-white border-white/20"
                      : isDone
                      ? "bg-white/5 text-white/50 border-white/10"
                      : "bg-transparent text-white/20 border-white/5"
                  }`}
                >
                  {isDone ? "✓ Validated" : isCurrent ? row.role : "Pending"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-white/30 pt-1">
        <span>{activeRow} / {parseRows.length} processed</span>
        <span className="text-white/60">99.8% accuracy</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   VISUAL 2 – Template
───────────────────────────────────────────────────────────── */
function TemplateVisual() {
  const raw = `Hi {{name}},\n\nI noticed your team at {{company}} is scaling full-stack microservices — I'd love to contribute as a senior engineer.\n\nAttached: {{resume}}`;
  const resolved = `Hi Sarah,\n\nI noticed your team at CloudScale AI is scaling full-stack microservices — I'd love to contribute as a senior engineer.\n\nAttached: FullStack_Abhishek.pdf`;

  const [phase, setPhase] = useState<"raw" | "resolving" | "done">("raw");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("resolving"), 900);
    const t2 = setTimeout(() => setPhase("done"), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const typed = useTypewriter(phase === "done" ? resolved : raw, 18, [phase]);

  const highlight = (text: string) =>
    text.split(/(\{\{[^}]+\}\}|Sarah|CloudScale AI|FullStack_Abhishek\.pdf)/g).map((seg, i) => {
      if (/^\{\{/.test(seg))
        return (
          <span key={i} className="bg-white/10 text-white/60 px-0.5 rounded border border-white/15">
            {seg}
          </span>
        );
      if (/Sarah|CloudScale AI|FullStack_Abhishek/.test(seg))
        return (
          <span key={i} className="bg-white/15 text-white px-0.5 rounded font-semibold border border-white/20">
            {seg}
          </span>
        );
      return seg;
    });

  return (
    <div className="space-y-3 relative z-10">
      <div className="flex items-center justify-between text-[11px] font-mono pb-2.5 border-b border-white/10">
        <span className="flex items-center gap-1.5 text-white/70">
          <Terminal className="w-3.5 h-3.5" /> template_engine.ts
        </span>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all duration-300 ${
            phase === "done"
              ? "text-white bg-white/10 border-white/20"
              : phase === "resolving"
              ? "text-white/70 bg-white/5 border-white/15 animate-pulse"
              : "text-white/30 bg-transparent border-white/10"
          }`}
        >
          {phase === "done" ? "✓ Merged 100%" : phase === "resolving" ? "⟳ Resolving tags…" : "Template raw"}
        </span>
      </div>

      <div className="rounded-xl bg-black/60 border border-white/10 p-4 font-mono text-[11px] text-white/60 whitespace-pre-wrap leading-relaxed min-h-[110px]">
        {highlight(typed)}
        <span className="inline-block w-px h-3 bg-white/70 align-middle animate-pulse ml-0.5" />
      </div>

      <div className="flex items-center gap-3 text-[10px] font-mono text-white/30">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-white/10 border border-white/20 inline-block" />
          Liquid tag
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-white/15 border border-white/25 inline-block" />
          Resolved value
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   VISUAL 3 – Dispatch
───────────────────────────────────────────────────────────── */
function DispatchVisual() {
  const [sent, setSent] = useState(38);
  const [countdown, setCountdown] = useState(14);
  const [pulseIdx, setPulseIdx] = useState(0);
  const animSent = useAnimatedCounter(sent, 800);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown((p) => {
        if (p <= 1) { setSent((s) => Math.min(s + 1, 50)); return 14; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setPulseIdx((p) => (p + 1) % 3), 500);
    return () => clearInterval(t);
  }, []);

  const pct = Math.round((animSent / 50) * 100);

  return (
    <div className="space-y-4 relative z-10">
      <div className="flex items-center justify-between text-[11px] font-mono pb-2.5 border-b border-white/10">
        <span
          className="flex items-center gap-1.5 text-white/70"
          style={{ animation: "sendBounce 0.9s ease-in-out infinite" }}
        >
          <Send className="w-3.5 h-3.5" />
          Gmail OAuth2 Dispatcher
        </span>
        <span className="text-white/40 font-mono text-[10px]">Jitter: 15–45s</span>
      </div>

      <div>
        <div className="flex justify-between text-[11px] font-mono text-white/40 mb-1.5">
          <span>
            <span className="text-white font-bold">{animSent}</span> / 50 delivered
          </span>
          <span className="text-white/60">{pct}%</span>
        </div>
        <div className="h-2.5 w-full bg-black rounded-full overflow-hidden border border-white/10">
          <div
            className="h-full rounded-full bg-white transition-all duration-700 relative overflow-hidden"
            style={{ width: `${pct}%` }}
          >
            <span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-black/20 to-transparent"
              style={{ animation: "shimmer 1.4s linear infinite" }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {["Sent", "Queued", "Next"].map((label, i) => (
          <div
            key={label}
            className={`rounded-xl border p-2.5 text-center transition-all duration-300 ${
              i === pulseIdx
                ? "border-white/30 bg-white/8 shadow-[0_0_12px_rgba(255,255,255,0.05)]"
                : "border-white/[0.06] bg-black/40"
            }`}
          >
            <div className="text-lg font-bold font-mono text-white">
              {i === 0 ? animSent : i === 1 ? 50 - animSent : `${String(countdown).padStart(2, "0")}s`}
            </div>
            <div className="text-[10px] text-white/30 font-mono mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2.5 p-2.5 bg-black/40 rounded-xl border border-white/10">
        <MailCheck className="w-4 h-4 text-white/60 shrink-0" />
        <span className="text-[11px] font-mono text-white/40">
          Token refreshed • No 429 errors •{" "}
          <span className="text-white">Queue Healthy</span>
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   VISUAL 4 – Telemetry
───────────────────────────────────────────────────────────── */
const logEntries = [
  { email: "sarah.c@cloudscale.ai", status: "250 OK", opacity: "text-white" },
  { email: "alex.t@techcorp.io", status: "250 OK", opacity: "text-white" },
  { email: "mark.r@fintech.io", status: "Queued", opacity: "text-white/60" },
  { email: "priya.n@buildfast.dev", status: "Dispatching", opacity: "text-white/40" },
];

function TelemetryVisual() {
  const [visible, setVisible] = useState(1);
  const [barHeights] = useState(() =>
    Array.from({ length: 12 }, () => 20 + Math.random() * 80)
  );
  const [animHeights, setAnimHeights] = useState(barHeights.map(() => 5));

  useEffect(() => {
    const t = setInterval(
      () => setVisible((p) => (p < logEntries.length ? p + 1 : p)),
      700
    );
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(
      () => setAnimHeights(barHeights.map((h) => 5 + Math.random() * (h - 5))),
      800
    );
    return () => clearInterval(t);
  }, [barHeights]);

  return (
    <div className="space-y-3 relative z-10">
      <div className="flex items-center justify-between text-[11px] font-mono pb-2.5 border-b border-white/10">
        <span className="flex items-center gap-1.5 text-white/70">
          <Wifi className="w-3.5 h-3.5" /> Live Webhook Stream
        </span>
        <span className="flex items-center gap-1.5 text-white/60">
          <span
            className="w-2 h-2 rounded-full bg-white"
            style={{ animation: "bwPing 1s ease-in-out infinite" }}
          />
          Realtime
        </span>
      </div>

      {/* bar chart */}
      <div className="flex items-end gap-1 h-10 px-1">
        {animHeights.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-white/20 transition-all duration-700 ease-in-out"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>

      <div className="space-y-1.5">
        {logEntries.slice(0, visible).map((entry, i) => (
          <div
            key={entry.email}
            className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-black/50 border border-white/[0.08] font-mono text-[11px] transition-all duration-500"
            style={{
              opacity: i < visible ? 1 : 0,
              transform: i < visible ? "translateY(0)" : "translateY(6px)",
            }}
          >
            <span className="text-white/40 truncate mr-2">{entry.email}</span>
            <span className={`${entry.opacity} font-semibold shrink-0`}>{entry.status}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-white/30 pt-0.5">
        <span>0 Bounces detected</span>
        <span className="text-white/50">Auto-retry: Standby</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
export default function EmailProcessAnimation() {
  const [activeStep, setActiveStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const ticksPerStep = STEP_DURATION_MS / TICK_MS;

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= ticksPerStep) {
          setActiveStep((curr) => {
            const next = (curr % STEPS.length) + 1;
            setAnimKey((k) => k + 1);
            return next;
          });
          return 0;
        }
        return prev + 1;
      });
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [isPlaying, ticksPerStep]);

  const handleStepClick = (stepId: number) => {
    setActiveStep(stepId);
    setProgress(0);
    setAnimKey((k) => k + 1);
  };

  const currentStep = STEPS.find((s) => s.id === activeStep) ?? STEPS[0];
  const progressPct = (progress / ticksPerStep) * 100;

  return (
    <>
      <style>{`
        @keyframes bwPing {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.3; transform: scale(0.7); }
        }
        @keyframes sendBounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          40%       { transform: translateY(-3px) rotate(-12deg); }
          70%       { transform: translateY(1px) rotate(4deg); }
        }
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes gridFade {
          0%, 100% { opacity: 0.025; }
          50%       { opacity: 0.055; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.06; }
          50%       { opacity: 0.13; }
        }
        @keyframes scanMove {
          0%   { top: 0%; }
          100% { top: 100%; }
        }
        .anim-slide-up   { animation: slideUp 0.45s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-fade-scale { animation: fadeInScale 0.4s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <div className="relative w-full max-w-5xl mx-auto rounded-3xl border border-white/[0.08] bg-zinc-950 p-6 md:p-8 shadow-[0_32px_80px_rgba(0,0,0,0.8)] overflow-hidden text-zinc-100">

        {/* ── Ambient white glow blobs ─────────────────── */}
        <div
          className="pointer-events-none absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full blur-[90px]"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)",
            animation: "glowPulse 3.5s ease-in-out infinite",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -right-32 h-[360px] w-[360px] rounded-full blur-[90px]"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)",
            animation: "glowPulse 3.5s ease-in-out infinite 1.75s",
          }}
        />

        {/* ── Dot-grid mesh ────────────────────────────── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            animation: "gridFade 6s ease-in-out infinite",
          }}
        />

        {/* ── Header ───────────────────────────────────── */}
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.07] pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-medium border border-white/10 bg-white/[0.04] text-white/50 mb-3">
              <Flame className="w-3 h-3 text-white/70" />
              AI Execution Engine
            </div>
            <h2 className="text-2xl md:text-[28px] font-semibold tracking-tight text-white leading-snug">
              Automated Campaign Journey
            </h2>
            <p className="text-sm text-white/30 mt-1">
              Click any step to inspect the real-time automation lifecycle.
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-xl p-1.5">
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button
              onClick={() => { setActiveStep(1); setProgress(0); setAnimKey((k) => k + 1); }}
              className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Step Navigator ────────────────────────────── */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 my-6">
          {STEPS.map((step, idx) => {
            const isCurrent = activeStep === step.id;
            const isPassed = activeStep > step.id;
            const Icon = step.icon;

            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(step.id)}
                style={{ animationDelay: `${idx * 70}ms` }}
                className={`anim-slide-up group relative text-left rounded-2xl p-4 transition-all duration-300 border overflow-hidden ${
                  isCurrent
                    ? "bg-white/[0.07] border-white/25 shadow-[0_0_24px_rgba(255,255,255,0.05)] scale-[1.03]"
                    : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10 hover:scale-[1.01]"
                }`}
              >
                {/* top-edge glow on active */}
                {isCurrent && (
                  <div
                    className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"
                  />
                )}

                {/* progress bar */}
                {isCurrent && isPlaying && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5 rounded-b-2xl overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-none"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
                      isCurrent
                        ? "bg-white text-black shadow-[0_0_16px_rgba(255,255,255,0.2)] scale-105"
                        : isPassed
                        ? "bg-white/10 text-white/60 border border-white/15"
                        : "bg-white/[0.04] text-white/30 border border-white/[0.06]"
                    }`}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className={`text-[10px] font-mono tabular-nums ${isCurrent ? "text-white/70" : "text-white/20"}`}>
                    0{step.id}
                  </span>
                </div>

                <div className="text-[10px] font-mono uppercase tracking-widest text-white/25 mb-0.5">
                  {step.badge.split("•")[1]?.trim() ?? "Phase"}
                </div>
                <div className={`text-[13px] font-medium truncate transition-colors ${isCurrent ? "text-white" : "text-white/30 group-hover:text-white/60"}`}>
                  {step.title}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Main Stage ────────────────────────────────── */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

          {/* Left – Details */}
          <div
            key={`info-${activeStep}`}
            className="anim-fade-scale lg:col-span-5 flex flex-col justify-between rounded-2xl bg-white/[0.03] border border-white/[0.07] p-5"
          >
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.15)]">
                  <currentStep.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                    {currentStep.badge}
                  </div>
                  <h3 className="text-base font-semibold text-white leading-tight">
                    {currentStep.title}
                  </h3>
                </div>
              </div>

              <p className="text-[13px] font-medium text-white/60 mb-3">
                {currentStep.tagline}
              </p>
              <p className="text-xs leading-relaxed text-white/30 border-t border-white/[0.06] pt-3">
                {currentStep.description}
              </p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-2.5 mt-5 pt-4 border-t border-white/[0.06]">
              {currentStep.metrics.map((m, i) => (
                <div
                  key={i}
                  className="relative overflow-hidden bg-black/40 p-3 rounded-xl border border-white/[0.06] group"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-white/[0.03]" />
                  <div className="text-[10px] text-white/30 font-mono mb-1">{m.label}</div>
                  <div className="text-base font-bold text-white font-mono">{m.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right – Visual */}
          <div className="lg:col-span-7 rounded-2xl bg-white/[0.02] border border-white/[0.07] p-5 relative overflow-hidden flex flex-col justify-center min-h-[300px]">
            {/* inner grid */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.03]"
              style={{
                backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                backgroundSize: "18px 18px",
              }}
            />
            {/* accent top edge */}
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

            <div key={`vis-${animKey}`} className="anim-slide-up relative z-10">
              {currentStep.visualType === "parse"     && <ParseVisual />}
              {currentStep.visualType === "template"  && <TemplateVisual />}
              {currentStep.visualType === "dispatch"  && <DispatchVisual />}
              {currentStep.visualType === "telemetry" && <TelemetryVisual />}
            </div>
          </div>
        </div>

        {/* ── Status bar ───────────────────────────────── */}
        <div className="relative z-10 flex items-center justify-between mt-5 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 text-[11px] font-mono text-white/25">
            <CircleDot className="w-3 h-3 text-white/50" />
            System operational
          </div>

          {/* dot-pill nav */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((s) => (
              <div
                key={s.id}
                onClick={() => handleStepClick(s.id)}
                className={`h-[3px] rounded-full cursor-pointer transition-all duration-300 ${
                  activeStep === s.id
                    ? "w-6 bg-white"
                    : "w-1.5 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono text-white/25">
            <Zap className="w-3 h-3 text-white/40" />
            Step {activeStep} / {STEPS.length}
          </div>
        </div>
      </div>
    </>
  );
}

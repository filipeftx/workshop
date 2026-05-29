"use client";

import { useEffect, useState } from "react";

// Messages that cycle while a scan runs, so the wait feels like progress.
const LOADING_STEPS = [
  "Searching the live web…",
  "Reading recent sources…",
  "Spotting signals of change…",
  "Sorting into three futures…",
  "Writing design challenges…",
];

// ── Data shapes ──────────────────────────────────────────────────────────
type Signal = {
  headline: string;
  implication: string;
  source: { title: string; url: string };
  designChallenge: string;
};

type Buckets = {
  preferable: Signal[];
  probable: Signal[];
  dystopian: Signal[];
};

// Visual identity for each of the three futures.
const BUCKETS = [
  {
    key: "preferable" as const,
    label: "Preferable",
    blurb: "Futures we'd actively want",
    ring: "ring-emerald-200",
    chip: "bg-emerald-100 text-emerald-800",
    dot: "bg-emerald-500",
  },
  {
    key: "probable" as const,
    label: "Probable",
    blurb: "The likely default if trends continue",
    ring: "ring-slate-200",
    chip: "bg-slate-100 text-slate-700",
    dot: "bg-slate-500",
  },
  {
    key: "dystopian" as const,
    label: "Dystopian",
    blurb: "Futures we should want to avoid",
    ring: "ring-rose-200",
    chip: "bg-rose-100 text-rose-800",
    dot: "bg-rose-500",
  },
];

export default function FuturesScanner() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [buckets, setBuckets] = useState<Buckets | null>(null);
  const [scannedTopic, setScannedTopic] = useState("");
  const [active, setActive] = useState<Signal | null>(null);
  const [step, setStep] = useState(0);

  // While loading, advance the status message every 6 seconds.
  useEffect(() => {
    if (!loading) {
      setStep(0);
      return;
    }
    const id = setInterval(() => {
      setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 6000);
    return () => clearInterval(id);
  }, [loading]);

  async function runScan(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() || loading) return;
    setLoading(true);
    setError("");
    setBuckets(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed.");
      setBuckets(data.buckets);
      setScannedTopic(data.topic || topic);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setBuckets(null);
    setError("");
    setActive(null);
    setTopic("");
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="font-semibold tracking-tight">Futures Scanner</span>
          <span className="ml-auto text-sm text-slate-400">Signal detection for foresight work</span>
        </div>
      </header>

      {/* ── Input section ──────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 pt-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Turn a topic into signals of change.
        </h1>
        <p className="mt-4 text-lg text-slate-500">
          Scan recent developments and see them reframed across three futures:
          preferable, probable, and dystopian.
        </p>

        <form onSubmit={runScan} className="mt-8 flex flex-col sm:flex-row gap-3">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. AI tutors in schools, urban mobility, synthetic biology…"
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <button
            type="submit"
            disabled={loading || !topic.trim()}
            className="rounded-xl bg-accent px-6 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {loading ? "Scanning…" : "Scan"}
          </button>
        </form>

        {loading && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-accent" />
              <span className="text-sm font-medium text-ink">{LOADING_STEPS[step]}</span>
            </div>
            <p className="text-xs text-slate-400">This usually takes 30–60 seconds.</p>
          </div>
        )}
        {error && (
          <p className="mt-6 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        )}
      </section>

      {/* ── Loading skeleton (three columns filling in) ────────── */}
      {loading && (
        <section className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-6 md:grid-cols-3">
            {BUCKETS.map((b) => (
              <div key={b.key} className={`rounded-2xl bg-white p-4 ring-1 ${b.ring}`}>
                <div className="mb-4 flex items-center gap-2 px-1">
                  <span className={`h-2 w-2 rounded-full ${b.dot}`} />
                  <h3 className="font-semibold">{b.label}</h3>
                </div>
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="animate-pulse rounded-xl border border-slate-100 p-4">
                      <div className="h-4 w-3/4 rounded bg-slate-200" />
                      <div className="mt-2 h-3 w-full rounded bg-slate-100" />
                      <div className="mt-1.5 h-3 w-5/6 rounded bg-slate-100" />
                      <div className="mt-3 h-4 w-20 rounded-full bg-slate-100" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Results dashboard ──────────────────────────────────── */}
      {buckets && !loading && (
        <section className="mx-auto max-w-6xl px-6 py-14">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Signals for <span className="text-accent">{scannedTopic}</span>
            </h2>
            <button onClick={reset} className="text-sm text-slate-500 underline hover:text-ink">
              New scan
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {BUCKETS.map((b) => {
              const signals = buckets[b.key] ?? [];
              return (
                <div key={b.key} className={`rounded-2xl bg-white p-4 ring-1 ${b.ring}`}>
                  <div className="mb-4 px-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${b.dot}`} />
                      <h3 className="font-semibold">{b.label}</h3>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{b.blurb}</p>
                  </div>

                  <div className="space-y-3">
                    {signals.length === 0 && (
                      <p className="px-1 text-sm text-slate-400">No signals found.</p>
                    )}
                    {signals.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setActive(s)}
                        className="w-full rounded-xl border border-slate-100 bg-white p-4 text-left transition hover:border-slate-300 hover:shadow-sm"
                      >
                        <p className="font-medium leading-snug">{s.headline}</p>
                        <p className="mt-1.5 text-sm text-slate-500">{s.implication}</p>
                        <span className={`mt-3 inline-block rounded-full px-2 py-0.5 text-xs ${b.chip}`}>
                          {s.source?.title || "source"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Signal card detail (modal) ─────────────────────────── */}
      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setActive(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-xl font-semibold leading-snug">{active.headline}</h3>
              <button
                onClick={() => setActive(null)}
                className="shrink-0 text-slate-400 hover:text-ink"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-5 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Implication</p>
                <p className="mt-1 text-slate-700">{active.implication}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Design challenge</p>
                <p className="mt-1 text-base font-medium text-ink">{active.designChallenge}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Source</p>
                {active.source?.url ? (
                  <a
                    href={active.source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-accent underline break-all"
                  >
                    {active.source.title || active.source.url}
                  </a>
                ) : (
                  <p className="mt-1 text-slate-500">{active.source?.title || "—"}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

'use client';

import { useEffect, useState, useRef } from 'react';

type Question = { id: number; text: string; created_at: number };

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleString();
}

export default function PresenterPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const [, setTick] = useState(0);
  const newestIdRef = useRef<number>(0);
  const [flashId, setFlashId] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    async function fetchOnce() {
      try {
        const res = await fetch('/api/questions', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!alive) return;
        setQuestions(data.questions);
        setCount(data.count);
        setError(null);
        setLastFetch(Date.now());
        const newest = data.questions[0]?.id ?? 0;
        if (newest > newestIdRef.current && newestIdRef.current !== 0) {
          setFlashId(newest);
          setTimeout(() => setFlashId((cur) => (cur === newest ? null : cur)), 1800);
        }
        newestIdRef.current = newest;
      } catch (e: any) {
        if (!alive) return;
        setError(e.message || 'Connection error');
      }
    }
    fetchOnce();
    const interval = setInterval(fetchOnce, 2500);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 10000);
    return () => clearInterval(t);
  }, []);

  async function clearAll() {
    const key = window.prompt('Admin key to clear all questions:');
    if (!key) return;
    const res = await fetch(`/api/questions?key=${encodeURIComponent(key)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      alert('Clear failed: ' + (res.status === 401 ? 'wrong key' : res.status));
      return;
    }
    setQuestions([]);
    setCount(0);
    newestIdRef.current = 0;
  }

  const stale = lastFetch && Date.now() - lastFetch > 8000;

  return (
    <main className="min-h-screen px-4 sm:px-8 py-6 max-w-5xl mx-auto w-full">
      <header className="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-indigo-300/80 mb-1">
            AI 301 · Presenter view
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold">From Tools to Transformation</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-5xl sm:text-6xl font-bold tabular-nums leading-none text-indigo-300">
              {count}
            </div>
            <div className="text-xs uppercase tracking-wider text-slate-500 mt-1">
              questions
            </div>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              error || stale ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'
            }`}
          />
          <span>
            {error ? `Connection error: ${error}` : stale ? 'Reconnecting…' : 'Live'}
          </span>
        </div>
        <button
          onClick={clearAll}
          className="text-slate-500 hover:text-rose-400 transition-colors"
        >
          Clear all
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-24 text-slate-500">
          Waiting for the first question…
        </div>
      ) : (
        <ul className="space-y-3">
          {questions.map((q, i) => (
            <li
              key={q.id}
              className={`rounded-xl border p-4 sm:p-5 transition-colors ${
                flashId === q.id
                  ? 'border-indigo-400 bg-indigo-500/10'
                  : 'border-slate-800 bg-slate-900/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-xs tabular-nums text-slate-500 min-w-[2ch] pt-1">
                  #{count - i}
                </div>
                <div className="flex-1">
                  <div className="text-base sm:text-lg leading-relaxed whitespace-pre-wrap">
                    {q.text}
                  </div>
                  <div className="text-xs text-slate-500 mt-2">{timeAgo(q.created_at)}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

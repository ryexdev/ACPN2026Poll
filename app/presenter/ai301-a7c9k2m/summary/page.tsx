'use client';

import { useEffect, useMemo, useState } from 'react';

type Question = { id: number; text: string; created_at: number };

const STOPWORDS = new Set([
  'a','an','the','and','or','but','if','then','else','is','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','should','could','can','may','might','must',
  'i','you','he','she','it','we','they','me','him','her','us','them','my','your','his','its','our','their',
  'this','that','these','those','of','to','in','on','at','by','for','with','from','as','about','into',
  'over','under','up','down','out','just','like','what','how','when','where','why','who','which','whom',
  'some','any','all','no','not','so','too','very','really','much','more','most','other','than','also',
  'because','while','during','after','before','each','every','there','here','get','got','say','said',
  'make','made','take','taken','taking','know','knows','think','thinking','thought','want','wants',
  'need','needs','use','used','using','thing','things','way','ways','one','two','three','lot','lots',
  'anything','something','someone','everyone','anyone','nothing','everything','im','ive','youre','dont',
  'didnt','doesnt','wont','cant','were','theyre','its','theres','thats','weve','theyve','id','youd',
  'hed','shed','wed','theyd','isnt','arent','wasnt','werent','havent','hasnt','hadnt','still','even',
  'yet','ever','never','always','often','sometimes','maybe','perhaps','thanks','thank','please','hi',
  'hello','hey','good','bad','nice','great','okay','ok','sure','yeah','yes','yep','nope',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

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

type Analysis = {
  wordField: { word: string; count: number }[];
  ranked: { q: Question; score: number; matched: string[] }[];
};

function analyze(questions: Question[]): Analysis {
  // Step 1: word field — how many questions each word appears in.
  const docFreq = new Map<string, number>();
  const perQuestionTokens = new Map<number, Set<string>>();
  for (const q of questions) {
    const tokens = new Set(tokenize(q.text));
    perQuestionTokens.set(q.id, tokens);
    for (const t of tokens) {
      docFreq.set(t, (docFreq.get(t) || 0) + 1);
    }
  }

  const wordField = [...docFreq.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));

  // Step 2: score each question = sum of its words' document frequencies.
  // Words that only appear once (unique to that question) add nothing beyond themselves,
  // so representative questions rise.
  const ranked = questions
    .map((q) => {
      const tokens = perQuestionTokens.get(q.id) || new Set();
      let score = 0;
      const matched: string[] = [];
      for (const t of tokens) {
        const freq = docFreq.get(t) || 0;
        score += freq;
        if (freq >= 2) matched.push(t);
      }
      matched.sort((a, b) => (docFreq.get(b) || 0) - (docFreq.get(a) || 0));
      return { q, score, matched };
    })
    .sort((a, b) => b.score - a.score || b.q.created_at - a.q.created_at);

  return { wordField, ranked };
}

function highlightMatched(text: string, matched: string[]): React.ReactNode {
  if (matched.length === 0) return text;
  const escaped = matched.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const re = new RegExp(`\\b(${escaped})\\b`, 'gi');
  const parts = text.split(re);
  const set = new Set(matched.map((m) => m.toLowerCase()));
  return parts.map((p, i) =>
    set.has(p.toLowerCase()) ? (
      <mark key={i} className="bg-indigo-500/30 text-indigo-100 rounded px-0.5">
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export default function SummaryPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const [filterWord, setFilterWord] = useState<string | null>(null);

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
      } catch (e: any) {
        if (!alive) return;
        setError(e.message || 'Connection error');
      }
    }
    fetchOnce();
    const interval = setInterval(fetchOnce, 5000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  const { wordField, ranked } = useMemo(() => analyze(questions), [questions]);

  const topWords = wordField.slice(0, 20);
  const maxCount = topWords[0]?.count || 1;

  const visible = useMemo(() => {
    if (!filterWord) return ranked;
    return ranked.filter((r) => r.q.text.toLowerCase().includes(filterWord));
  }, [ranked, filterWord]);

  const stale = lastFetch && Date.now() - lastFetch > 12000;

  return (
    <main className="min-h-screen px-4 sm:px-8 py-6 max-w-6xl mx-auto w-full">
      <header className="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-indigo-300/80 mb-1">
            AI 301 · Summary
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold">Ranked by shared vocabulary</h1>
          <a
            href="/presenter/ai301-a7c9k2m"
            className="text-xs text-slate-400 hover:text-indigo-300 transition-colors"
          >
            ← back to live view
          </a>
        </div>
        <div className="text-right">
          <div className="text-5xl sm:text-6xl font-bold tabular-nums leading-none text-indigo-300">
            {count}
          </div>
          <div className="text-xs uppercase tracking-wider text-slate-500 mt-1">
            questions
          </div>
        </div>
      </header>

      <div className="flex items-center justify-between text-xs text-slate-500 mb-6">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              error || stale ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'
            }`}
          />
          <span>
            {error ? `Connection error: ${error}` : stale ? 'Reconnecting…' : 'Live · refresh every 5s'}
          </span>
        </div>
        <div>
          {wordField.length} distinct word{wordField.length === 1 ? '' : 's'}
        </div>
      </div>

      <section className="mb-8">
        <h2 className="text-sm uppercase tracking-wider text-slate-400 mb-3">
          Word field — top 20
        </h2>
        {topWords.length === 0 ? (
          <div className="text-slate-500 text-sm">No questions yet.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterWord(null)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                filterWord === null
                  ? 'bg-indigo-500 border-indigo-400 text-white'
                  : 'bg-slate-900/50 border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              All
            </button>
            {topWords.map((w) => {
              const sizeClass =
                w.count / maxCount > 0.66
                  ? 'text-base font-semibold'
                  : w.count / maxCount > 0.33
                  ? 'text-sm'
                  : 'text-xs';
              return (
                <button
                  key={w.word}
                  onClick={() => setFilterWord(w.word === filterWord ? null : w.word)}
                  className={`px-3 py-1.5 rounded-full border transition-colors ${sizeClass} ${
                    filterWord === w.word
                      ? 'bg-indigo-500 border-indigo-400 text-white'
                      : 'bg-slate-900/50 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {w.word} <span className="text-slate-400 font-mono">· {w.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-slate-400 mb-3">
          Questions — ranked by shared-word score
        </h2>
        <ul className="space-y-3">
          {visible.map((r, i) => (
            <li
              key={r.q.id}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center min-w-[3rem] pt-0.5">
                  <div className="text-xs text-slate-500">#{i + 1}</div>
                  <div className="text-lg font-semibold tabular-nums text-indigo-300">
                    {r.score}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-base sm:text-lg leading-relaxed whitespace-pre-wrap">
                    {highlightMatched(r.q.text, r.matched)}
                  </div>
                  <div className="text-xs text-slate-500 mt-2 flex items-center gap-3 flex-wrap">
                    <span>{timeAgo(r.q.created_at)}</span>
                    {r.matched.length > 0 && (
                      <span className="text-slate-600">
                        matches: {r.matched.slice(0, 6).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

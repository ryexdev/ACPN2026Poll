'use client';

import { useState, useRef, useEffect } from 'react';

const MAX_LEN = 500;

export default function SubmitPage() {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (status === 'idle') textareaRef.current?.focus();
  }, [status]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || status === 'sending') return;
    setStatus('sending');
    setErrorMsg('');
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send');
      }
      setStatus('sent');
      setText('');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Something went wrong');
    }
  }

  function askAnother() {
    setStatus('idle');
    setErrorMsg('');
  }

  return (
    <main className="min-h-screen flex flex-col px-5 py-8 max-w-xl mx-auto w-full">
      <header className="mb-8">
        <div className="text-xs uppercase tracking-[0.2em] text-indigo-300/80 mb-2">
          AI 301
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold leading-tight">
          From Tools to Transformation
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          by Ryan<sup>2</sup> · Ask a question for the panel
        </p>
      </header>

      {status === 'sent' ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 py-12">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <div className="text-xl font-semibold">Question sent</div>
            <div className="text-slate-400 text-sm mt-1">Thanks — the panel will see it.</div>
          </div>
          <button
            onClick={askAnother}
            className="mt-2 px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 font-semibold transition-colors"
          >
            Ask another
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4 flex-1">
          <label className="text-sm text-slate-300" htmlFor="q">
            Your question
          </label>
          <textarea
            id="q"
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
            placeholder="What would you like the panel to address?"
            rows={6}
            autoFocus
            enterKeyHint="send"
            className="w-full rounded-xl bg-slate-900/70 border border-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 outline-none p-4 text-base leading-relaxed resize-none placeholder:text-slate-500"
          />
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{text.length}/{MAX_LEN}</span>
            {status === 'error' && (
              <span className="text-rose-400">{errorMsg}</span>
            )}
          </div>
          <button
            type="submit"
            disabled={!text.trim() || status === 'sending'}
            className="mt-auto sm:mt-4 w-full py-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 disabled:bg-slate-700 disabled:text-slate-400 font-semibold text-base transition-colors"
          >
            {status === 'sending' ? 'Sending…' : 'Send question'}
          </button>
        </form>
      )}
    </main>
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { insertQuestion, listQuestions, countQuestions, clearQuestions } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_LEN = 500;

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const raw = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!raw) {
    return NextResponse.json({ error: 'Question is empty' }, { status: 400 });
  }
  const text = raw.slice(0, MAX_LEN);
  const q = insertQuestion(text);
  return NextResponse.json({ ok: true, question: q });
}

export async function GET() {
  const questions = listQuestions();
  const count = countQuestions();
  return NextResponse.json(
    { count, questions },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  if (!key || key !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  clearQuestions();
  return NextResponse.json({ ok: true });
}

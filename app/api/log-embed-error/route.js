import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const data = await request.json();
    const logLine = `[${new Date().toISOString()}] Embed Error: ${JSON.stringify(data)}\n`;
    console.error('🚨 [CLIENT EMBED ERROR]:', data);
    fs.appendFileSync('/tmp/embed-client-errors.log', logLine);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

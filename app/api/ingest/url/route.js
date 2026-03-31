import { NextResponse } from 'next/server';
import { scrapeUrl } from '@/lib/scraper';
import { chunkText } from '@/lib/chunker';
import { embed } from '@/lib/embeddings';
import { insertItem } from '@/lib/vectorStore';

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url || url.trim().length === 0) {
      return NextResponse.json({ error: 'URL cannot be empty' }, { status: 400 });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const text = await scrapeUrl(url);
    if (text.trim().length === 0) {
      return NextResponse.json({ error: 'No text content found at URL' }, { status: 400 });
    }

    const chunks = chunkText(text);
    let inserted = 0;

    for (const chunk of chunks) {
      const vector = await embed(chunk);
      await insertItem(vector, { text: chunk, source: url });
      inserted++;
    }

    return NextResponse.json({ success: true, chunksInserted: inserted, url });
  } catch (error) {
    console.error('URL ingest error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

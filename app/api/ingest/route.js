import { NextResponse } from 'next/server';
import { chunkText } from '@/lib/chunker';
import { embed } from '@/lib/embeddings';
import { insertItem } from '@/lib/vectorStore';

export async function POST(request) {
  try {
    const { text, source = 'manual' } = await request.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text cannot be empty' }, { status: 400 });
    }

    const chunks = chunkText(text);
    let inserted = 0;

    for (const chunk of chunks) {
      const vector = await embed(chunk);
      await insertItem(vector, { text: chunk, source });
      inserted++;
    }

    return NextResponse.json({ success: true, chunksInserted: inserted });
  } catch (error) {
    console.error('Ingest error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

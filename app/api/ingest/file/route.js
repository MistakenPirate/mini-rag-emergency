import { NextResponse } from 'next/server';
import { chunkText } from '@/lib/chunker';
import { embed } from '@/lib/embeddings';
import { insertItem } from '@/lib/vectorStore';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    if (text.trim().length === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    const chunks = chunkText(text);
    let inserted = 0;

    for (const chunk of chunks) {
      const vector = await embed(chunk);
      await insertItem(vector, { text: chunk, source: file.name });
      inserted++;
    }

    return NextResponse.json({ success: true, chunksInserted: inserted, fileName: file.name });
  } catch (error) {
    console.error('File ingest error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

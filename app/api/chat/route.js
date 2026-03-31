import { NextResponse } from 'next/server';
import { embed } from '@/lib/embeddings';
import { query } from '@/lib/vectorStore';
import { chat } from '@/lib/groq';

export async function POST(request) {
  try {
    const { message } = await request.json();

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    const topK = parseInt(process.env.TOP_K || '3', 10);

    // Embed the user's question
    const vector = await embed(message);

    // Retrieve similar chunks
    let chunks = [];
    try {
      chunks = await query(vector, topK);
    } catch {
      // Index might be empty
    }

    // Call Groq with context
    const response = await chat(message, chunks);

    return NextResponse.json({
      response,
      chunks,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

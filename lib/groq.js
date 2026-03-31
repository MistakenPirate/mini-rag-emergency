import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Send a RAG-augmented chat request to Groq.
export async function chat(userMessage, chunks) {
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  let systemPrompt = 'You are a helpful assistant that answers questions based on the provided context. If the context does not contain relevant information, say so honestly.';

  if (chunks.length > 0) {
    const context = chunks
      .map((c, i) => `[Chunk ${i + 1}] (source: ${c.source}, similarity: ${c.score.toFixed(3)})\n${c.text}`)
      .join('\n\n');
    systemPrompt += `\n\nContext from knowledge base:\n${context}`;
  } else {
    systemPrompt += '\n\nNo documents have been ingested into the knowledge base yet. Let the user know they should add some text first.';
  }

  const completion = await groq.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 1024,
  });

  return completion.choices[0]?.message?.content || 'No response generated.';
}

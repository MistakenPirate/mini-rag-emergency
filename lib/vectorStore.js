import { LocalIndex } from 'vectra';
import path from 'path';

const INDEX_PATH = path.join(process.cwd(), 'data', 'vector-index');

let index = null;

export async function getIndex() {
  if (!index) {
    index = new LocalIndex(INDEX_PATH);
    if (!(await index.isIndexCreated())) {
      await index.createIndex();
    }
  }
  return index;
}

// Insert a chunk with its embedding vector into the store. metadata: { text, source }
export async function insertItem(vector, metadata) {
  const idx = await getIndex();
  await idx.insertItem({ vector, metadata });
}

// Query the store for top-k similar items using cosine similarity.
export async function query(vector, topK = 3) {
  const idx = await getIndex();
  const results = await idx.queryItems(vector, topK);
  return results.map((r) => ({
    text: r.item.metadata.text,
    source: r.item.metadata.source,
    score: r.score,
  }));
}

// Delete all items from the index.
export async function clearAll() {
  const idx = await getIndex();
  const items = await idx.listItems();
  for (const item of items) {
    await idx.deleteItem(item.id);
  }
}

// Get the count of items in the index.
export async function getCount() {
  const idx = await getIndex();
  const items = await idx.listItems();
  return items.length;
}

import { NextResponse } from 'next/server';
import { clearAll, getCount } from '@/lib/vectorStore';

export async function GET() {
  try {
    const count = await getCount();
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}

export async function DELETE() {
  try {
    await clearAll();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Clear error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

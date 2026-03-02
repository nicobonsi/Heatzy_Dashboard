import { NextRequest, NextResponse } from 'next/server';
import { gizwitsRenameDevice } from '@/lib/api/gizwits';

export async function PUT(
  req: NextRequest,
  { params }: { params: { did: string } }
) {
  const token = req.headers.get('x-user-token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { name } = await req.json();
    await gizwitsRenameDevice(token, params.did, name);
    return NextResponse.json({ ok: true });
  } catch {
    // If GizWits rename fails, client will fall back to localStorage
    return NextResponse.json({ error: 'Rename API unavailable' }, { status: 500 });
  }
}

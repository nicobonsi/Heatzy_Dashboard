import { NextRequest, NextResponse } from 'next/server';
import { gizwitsControlDevice } from '@/lib/api/gizwits';

export async function POST(
  req: NextRequest,
  { params }: { params: { did: string } }
) {
  const token = req.headers.get('x-user-token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const payload = await req.json();
    await gizwitsControlDevice(token, params.did, payload);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Control failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

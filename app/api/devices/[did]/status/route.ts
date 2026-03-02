import { NextRequest, NextResponse } from 'next/server';
import { gizwitsGetDeviceStatus } from '@/lib/api/gizwits';

export async function GET(
  req: NextRequest,
  { params }: { params: { did: string } }
) {
  const token = req.headers.get('x-user-token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const data = await gizwitsGetDeviceStatus(token, params.did);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

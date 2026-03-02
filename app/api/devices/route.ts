import { NextRequest, NextResponse } from 'next/server';
import { gizwitsGetDevices } from '@/lib/api/gizwits';

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-user-token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const data = await gizwitsGetDevices(token);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch devices';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

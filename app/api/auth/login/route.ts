import { NextRequest, NextResponse } from 'next/server';
import { gizwitsLogin } from '@/lib/api/gizwits';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }
    const data = await gizwitsLogin(username, password);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

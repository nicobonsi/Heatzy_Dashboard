// Server-side only — used in Next.js API routes
// Never import this from client components

const BASE_URL = process.env.GIZWITS_BASE_URL!;
const APP_ID = process.env.GIZWITS_APP_ID!;

function gizwitsHeaders(userToken?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Gizwits-Application-Id': APP_ID,
  };
  if (userToken) headers['X-Gizwits-User-token'] = userToken;
  return headers;
}

export async function gizwitsLogin(username: string, password: string) {
  const res = await fetch(`${BASE_URL}/app/login`, {
    method: 'POST',
    headers: gizwitsHeaders(),
    body: JSON.stringify({ username, password, lang: 'en' }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function gizwitsGetDevices(userToken: string) {
  const res = await fetch(`${BASE_URL}/app/bindings?limit=20&skip=0`, {
    headers: gizwitsHeaders(userToken),
  });
  if (!res.ok) throw new Error(`Fetch devices failed: ${res.status}`);
  return res.json();
}

export async function gizwitsGetDeviceStatus(userToken: string, did: string) {
  const res = await fetch(`${BASE_URL}/app/devdata/${did}/latest`, {
    headers: gizwitsHeaders(userToken),
  });
  if (!res.ok) throw new Error(`Fetch status failed: ${res.status}`);
  return res.json();
}

export async function gizwitsControlDevice(
  userToken: string,
  did: string,
  payload: object
) {
  const res = await fetch(`${BASE_URL}/app/control/${did}`, {
    method: 'POST',
    headers: gizwitsHeaders(userToken),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Control failed (${res.status}): ${text}`);
  }
  return true;
}

export async function gizwitsRenameDevice(
  userToken: string,
  did: string,
  name: string
) {
  const res = await fetch(`${BASE_URL}/app/bindings/${did}`, {
    method: 'PUT',
    headers: gizwitsHeaders(userToken),
    body: JSON.stringify({ dev_alias: name }),
  });
  if (!res.ok) throw new Error(`Rename failed: ${res.status}`);
  return true;
}

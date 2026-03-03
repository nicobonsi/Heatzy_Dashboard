// Singleton WebSocket connection to the GizWits real-time API.
// A single connection receives push updates for all bound devices,
// matching how the Heatzy mobile app gets instant device state changes.

import { getStoredToken } from './auth';

const WS_URL = 'wss://euapi.gizwits.com/ws/app/sub';
const APP_ID = 'c70a66ff039d41b4a220e198b0fcc8b3';
const HEARTBEAT_MS = 55_000; // GizWits expects a ping every < 60 s

type AttrCallback = (attr: Record<string, unknown>) => void;

class GizwitsWebSocketManager {
  private ws: WebSocket | null = null;
  private subs = new Map<string, Set<AttrCallback>>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  /** Register a callback for attribute updates on a specific device. */
  subscribe(did: string, cb: AttrCallback): () => void {
    if (!this.subs.has(did)) this.subs.set(did, new Set());
    this.subs.get(did)!.add(cb);
    this.ensureConnected();
    return () => {
      this.subs.get(did)?.delete(cb);
    };
  }

  private ensureConnected() {
    if (this.destroyed) return;
    const state = this.ws?.readyState;
    if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return;
    this.connect();
  }

  private connect() {
    const auth = getStoredToken();
    if (!auth) return; // wait until the user is logged in

    const ws = new WebSocket(WS_URL);
    this.ws = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        cmd: 'login_req',
        data: {
          appid: APP_ID,
          uid: auth.uid,
          token: auth.token,
          p0_type: 'attrs_v4',
          heartbeat_interval: Math.round(HEARTBEAT_MS / 1000),
          auto_subscribe: true,
        },
      }));

      this.heartbeatTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ cmd: 'ping' }));
        }
      }, HEARTBEAT_MS);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as {
          cmd: string;
          data?: { did?: string; attr?: Record<string, unknown> };
        };
        // s2c_noti = attribute push notification
        if (msg.cmd === 's2c_noti' && msg.data?.did && msg.data.attr) {
          const { did, attr } = msg.data;
          this.subs.get(did)?.forEach((cb) => cb(attr));
        }
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      this.clearHeartbeat();
      if (!this.destroyed) {
        // Reconnect with back-off
        this.reconnectTimer = setTimeout(() => this.connect(), 5_000);
      }
    };

    ws.onerror = () => ws.close();
  }

  private clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  destroy() {
    this.destroyed = true;
    this.clearHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }
}

// One instance shared across the whole app (client-side only)
export const wsManager: GizwitsWebSocketManager | null =
  typeof window !== 'undefined' ? new GizwitsWebSocketManager() : null;

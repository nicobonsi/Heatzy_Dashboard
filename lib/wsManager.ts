// GizWits WebSocket client — singleton shared across all DeviceCards.
//
// Protocol reference:
//   wss://eum2m.gizwits.com:8880/ws/app/v1  (EU production server)
//   login_req → s2c_login_res → c2s_read (request current state)
//   s2c_noti carries attrs updates pushed by the device in real-time.
//
// Sources: heatzypy (cyr-ius/heatzypy), GizWits Open API docs

import { getStoredToken } from './auth';

const WS_URL      = 'wss://eum2m.gizwits.com:8880/ws/app/v1';
const APP_ID      = 'c70a66ff039d41b4a220e198b0fcc8b3';
const HEARTBEAT_S = 30;   // GizWits spec: must ping within 60 s; libraries use 30 s

type AttrsCallback       = (attrs: Record<string, unknown>) => void;
type OnlineCallback      = (online: boolean) => void;

interface Subscription {
  onAttrs:  AttrsCallback;
  onOnline?: OnlineCallback;
}

class GizwitsWebSocketManager {
  private ws:              WebSocket | null = null;
  private subs             = new Map<string, Set<Subscription>>();
  private heartbeatTimer:  ReturnType<typeof setInterval>  | null = null;
  private reconnectTimer:  ReturnType<typeof setTimeout>   | null = null;
  private destroyed        = false;
  private loggedIn         = false;

  /**
   * Subscribe to real-time updates for one device.
   * onAttrs   — called with the full attrs dict when the device reports a change.
   * onOnline  — called when the device comes online or goes offline.
   * Returns an unsubscribe function.
   */
  subscribe(
    did:      string,
    onAttrs:  AttrsCallback,
    onOnline?: OnlineCallback,
  ): () => void {
    if (!this.subs.has(did)) this.subs.set(did, new Set());
    const sub: Subscription = { onAttrs, onOnline };
    this.subs.get(did)!.add(sub);
    this.ensureConnected();

    // If already logged in, request the current device state immediately
    if (this.loggedIn && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ cmd: 'c2s_read', data: { did } }));
    }

    return () => {
      this.subs.get(did)?.delete(sub);
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
    if (!auth) return;

    this.loggedIn = false;
    const ws = new WebSocket(WS_URL);
    this.ws = ws;

    ws.onopen = () => {
      // 1. Send login immediately
      ws.send(JSON.stringify({
        cmd:  'login_req',
        data: {
          appid:               APP_ID,
          uid:                 auth.uid,
          token:               auth.token,
          p0_type:             'attrs_v4',
          heartbeat_interval:  HEARTBEAT_S,
          auto_subscribe:      true,
        },
      }));

      // 2. Start heartbeat
      this.heartbeatTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ cmd: 'ping' }));
        }
      }, HEARTBEAT_S * 1000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as {
          cmd:   string;
          data?: Record<string, unknown>;
        };

        switch (msg.cmd) {
          // ── Login confirmed ──────────────────────────────────────────
          case 's2c_login_res': {
            if ((msg.data as { success?: boolean })?.success) {
              this.loggedIn = true;
              // Request current state for every subscribed device
              for (const did of Array.from(this.subs.keys())) {
                ws.send(JSON.stringify({ cmd: 'c2s_read', data: { did } }));
              }
            }
            break;
          }

          // ── Device attribute push (state changed) ────────────────────
          case 's2c_noti': {
            // GizWits sends 'attrs' (not 'attr') in the data payload
            const { did, attrs } = msg.data as {
              did?:   string;
              attrs?: Record<string, unknown>;
            };
            if (did && attrs) {
              this.subs.get(did)?.forEach((s) => s.onAttrs(attrs));
            }
            break;
          }

          // ── Online / offline status change ───────────────────────────
          case 's2c_online_status': {
            const { did, online } = msg.data as {
              did?:    string;
              online?: boolean;
            };
            if (did !== undefined && online !== undefined) {
              this.subs.get(did)?.forEach((s) => s.onOnline?.(online));
            }
            break;
          }

          // ── Server error ─────────────────────────────────────────────
          case 's2c_invalid_msg': {
            const code = (msg.data as { error_code?: number })?.error_code;
            if (code === 1009) ws.close(); // force reconnect
            break;
          }

          // pong, s2c_binding_changed, etc. — no action needed
        }
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      this.loggedIn = false;
      this.clearHeartbeat();
      if (!this.destroyed) {
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

// --- Auth ---
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthToken {
  token: string;
  uid: string;
  expire_at: number; // Unix timestamp (seconds)
}

// --- GizWits Raw API ---
export interface GizwitsDevice {
  did: string;
  product_key: string;
  product_name: string;
  dev_alias: string;
  mac: string;
  is_online: boolean;
  role: string;
}

export interface GizwitsBindingsResponse {
  devices: GizwitsDevice[];
}

export interface GizwitsDeviceStatusResponse {
  attr: Record<string, unknown>;
  updated_at: number;
  did: string;
}

// --- App Domain ---
export type HeatzyMode = 'cft' | 'cft1' | 'cft2' | 'eco' | 'fro' | 'stop';

export interface ModeOption {
  value: HeatzyMode;
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
}

export interface Device {
  did: string;
  name: string;
  mac: string;
  isOnline: boolean;
  currentMode: HeatzyMode | null;
  productName: string;
  productKey: string;
}

// Schedule: 7 days × 24 hours
export type ScheduleMode = 'cft' | 'eco' | 'fro';
export type WeekSchedule = ScheduleMode[][]; // [day 0-6][hour 0-23]

// --- Zones (localStorage) ---
export interface Zone {
  id: string;
  name: string;
  deviceIds: string[];
  schedule?: WeekSchedule;
  createdAt: number;
}

// --- UI ---
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

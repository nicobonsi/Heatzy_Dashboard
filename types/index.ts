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

// --- Pilote Pro API attributes (all optional — only present on Pro devices) ---
// Temperatures are stored as integer × 10 (TEMPERATURE_SCALE=10), e.g. 200 = 20.0 °C
export interface PiloteProAttrs {
  cur_temp?: number;       // current room temperature × 10
  cur_humi?: number;       // current humidity %
  cft_temp?: number;       // comfort setpoint × 10
  eco_temp?: number;       // eco setpoint × 10
  window_switch?: 0 | 1;  // open-window detection: 0=off, 1=on
  derog_mode?: DerogationMode;
  derog_time?: number;     // duration in minutes (boost) or days (vacation)
  lock_switch?: 0 | 1;
  timer_switch?: 0 | 1;
}

// Derogation / override modes
export enum DerogationMode {
  Off      = 0,
  Vacation = 1,
  Boost    = 2,
  Presence = 3, // PIR-based presence detection
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

// Pilote Pro control mode: fil-pilote wire signals vs internal thermostat regulation
export type PiloteProControlMode = 'filpilote' | 'thermostat';

export interface Device {
  did: string;
  name: string;
  mac: string;
  isOnline: boolean;
  currentMode: HeatzyMode | null;
  productName: string;
  productKey: string;
  // Pro-specific live data (undefined for non-Pro devices)
  proAttrs?: PiloteProAttrs;
}

// Product key strings that identify a Pilote Pro
// (Product.pro = 6 in OlivierZal/heatzy-api enum)
export const PILOTE_PRO_PRODUCT_KEYS: readonly string[] = [
  // Add confirmed Pro product_key values here as they are discovered.
  // Until then, detection falls back to product_name check below.
];

// Returns true if the device is a Heatzy Pilote Pro
export function isPilotePro(device: Pick<Device, 'productName' | 'productKey'>): boolean {
  if (PILOTE_PRO_PRODUCT_KEYS.includes(device.productKey)) return true;
  const name = (device.productName ?? '').toLowerCase();
  return name.includes('pro') || name.includes('pilote pro');
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

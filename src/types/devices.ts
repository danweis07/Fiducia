/**
 * Device Management Types
 *
 * Registered devices and activity entries.
 */

// =============================================================================
// DEVICE MANAGEMENT
// =============================================================================

export interface RegisteredDevice {
  id: string;
  name: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  os: string;
  browser: string | null;
  isTrusted: boolean;
  isCurrent: boolean;
  lastActiveAt: string;
  lastIpAddress: string;
  lastLocation: string | null;
  registeredAt: string;
}

export interface DeviceActivityEntry {
  id: string;
  deviceId: string;
  action: string;
  ipAddress: string;
  location: string | null;
  timestamp: string;
}

/**
 * Demo data for auth, member, notifications, sessions, and devices.
 */

import {
  ActionHandler,
  TENANT_ID,
  DEMO_USER,
  withPagination,
  isoDate,
} from './types';

// =============================================================================
// NOTIFICATIONS
// =============================================================================

const NOTIFICATIONS = [
  { id: 'notif-001', userId: DEMO_USER.id, tenantId: TENANT_ID, type: 'transaction' as const, title: 'Large Transaction Alert', body: 'A debit of $1,250.00 was posted to your checking account.', isRead: false, actionUrl: '/accounts', createdAt: isoDate(0) },
  { id: 'notif-002', userId: DEMO_USER.id, tenantId: TENANT_ID, type: 'bill_due' as const, title: 'Bill Due Soon', body: 'Your Con Edison Electric bill of $152.00 is due in 5 days.', isRead: false, actionUrl: '/bills', createdAt: isoDate(1) },
  { id: 'notif-003', userId: DEMO_USER.id, tenantId: TENANT_ID, type: 'transfer' as const, title: 'Transfer Completed', body: 'Your transfer of $500.00 to savings has been completed.', isRead: true, actionUrl: '/transfers', createdAt: isoDate(3) },
  { id: 'notif-004', userId: DEMO_USER.id, tenantId: TENANT_ID, type: 'security' as const, title: 'New Device Login', body: 'A new login was detected from Chrome on macOS.', isRead: false, actionUrl: null, createdAt: isoDate(5) },
  { id: 'notif-005', userId: DEMO_USER.id, tenantId: TENANT_ID, type: 'rdc_status' as const, title: 'Deposit Approved', body: 'Your mobile deposit of $1,250.00 has been approved.', isRead: true, actionUrl: '/deposit', createdAt: isoDate(7) },
];

// =============================================================================
// HANDLERS
// =============================================================================

export const memberHandlers: Record<string, ActionHandler> = {
  // Notifications
  'notifications.list': () => withPagination({ notifications: NOTIFICATIONS }, NOTIFICATIONS.length),
  'notifications.markRead': () => ({ success: true }),
  'notifications.markAllRead': () => ({ success: true }),
  'notifications.unreadCount': () => ({ count: NOTIFICATIONS.filter((n) => !n.isRead).length }),

  // Auth / Profile
  'auth.profile': () => ({
    user: {
      id: DEMO_USER.id,
      tenantId: TENANT_ID,
      email: DEMO_USER.email,
      firstName: 'Demo',
      lastName: 'User',
      phone: '(555) 123-4567',
      dateOfBirth: null,
      kycStatus: 'approved',
      mfaEnabled: true,
      preferredLanguage: 'en',
      timezone: 'America/Chicago',
      createdAt: '2023-01-15T00:00:00Z',
      updatedAt: isoDate(0),
    },
  }),
  'auth.updateProfile': (p) => ({
    user: {
      id: DEMO_USER.id,
      tenantId: TENANT_ID,
      email: DEMO_USER.email,
      firstName: p.firstName || 'Demo',
      lastName: p.lastName || 'User',
      phone: p.phone || '(555) 123-4567',
      dateOfBirth: null,
      kycStatus: 'approved',
      mfaEnabled: true,
      preferredLanguage: p.preferredLanguage || 'en',
      timezone: p.timezone || 'America/Chicago',
      createdAt: '2023-01-15T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
  }),

  // Member Profile
  'member.addresses': () => ({
    addresses: [
      { id: 'addr-001', userId: DEMO_USER.id, type: 'home', isPrimary: true, line1: '742 Evergreen Terrace', line2: null, city: 'Springfield', state: 'IL', zip: '62704', country: 'US', verifiedAt: isoDate(90), createdAt: isoDate(365), updatedAt: isoDate(90) },
      { id: 'addr-002', userId: DEMO_USER.id, type: 'mailing', isPrimary: false, line1: 'PO Box 1234', line2: null, city: 'Springfield', state: 'IL', zip: '62705', country: 'US', verifiedAt: null, createdAt: isoDate(200), updatedAt: isoDate(200) },
    ],
  }),
  'member.updateAddress': (p) => ({
    address: { id: p.id, userId: DEMO_USER.id, type: p.type || 'home', isPrimary: p.isPrimary ?? true, line1: p.line1 || '742 Evergreen Terrace', line2: p.line2 || null, city: p.city || 'Springfield', state: p.state || 'IL', zip: p.zip || '62704', country: p.country || 'US', verifiedAt: null, createdAt: isoDate(365), updatedAt: new Date().toISOString() },
  }),
  'member.documents': () => ({
    documents: [
      { id: 'doc-001', userId: DEMO_USER.id, type: 'drivers_license', label: "Driver's License", documentNumberMasked: '****4521', issuingAuthority: 'Illinois SOS', issuedDate: '2022-03-15', expirationDate: '2026-03-15', status: 'verified', createdAt: isoDate(365) },
    ],
  }),
  'member.identifiers': () => ({
    identifiers: [
      { id: 'ident-001', userId: DEMO_USER.id, type: 'ssn', valueMasked: '***-**-6789', isPrimary: true, createdAt: isoDate(365) },
      { id: 'ident-002', userId: DEMO_USER.id, type: 'member_number', valueMasked: 'MBR****4521', isPrimary: false, createdAt: isoDate(365) },
    ],
  }),
};

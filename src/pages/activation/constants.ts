import {
  Shield,
  CheckCircle2,
  Smartphone,
  Key,
  FileText,
  User,
  Lock,
  Fingerprint,
} from "lucide-react";
import type { ActivationStepId, IdentityField, MFAMethod } from "@/types/activation";

export const STEP_ORDER: ActivationStepId[] = [
  "identity",
  "terms",
  "credentials",
  "mfa",
  "device",
  "complete",
];

export const STEP_META: Record<
  ActivationStepId,
  { icon: React.ElementType; label: string }
> = {
  identity: { icon: User, label: "Identity Verification" },
  terms: { icon: FileText, label: "Terms & Disclosures" },
  credentials: { icon: Lock, label: "Create Credentials" },
  mfa: { icon: Shield, label: "Multi-Factor Auth" },
  device: { icon: Smartphone, label: "Device Registration" },
  complete: { icon: CheckCircle2, label: "Complete" },
};

export const IDENTITY_FIELD_LABELS: Record<IdentityField, string> = {
  accountNumber: "Account Number",
  ssn: "Last 4 of SSN",
  dateOfBirth: "Date of Birth",
  lastName: "Last Name",
  email: "Email Address",
  phone: "Phone Number",
  zipCode: "ZIP Code",
};

export const MFA_METHOD_META: Record<
  MFAMethod,
  { icon: React.ElementType; label: string; description: string }
> = {
  sms: {
    icon: Smartphone,
    label: "Text Message (SMS)",
    description: "Receive a verification code via text message",
  },
  email: {
    icon: FileText,
    label: "Email",
    description: "Receive a verification code via email",
  },
  totp: {
    icon: Key,
    label: "Authenticator App",
    description: "Use an app like Google Authenticator or Authy",
  },
  push: {
    icon: Smartphone,
    label: "Push Notification",
    description: "Approve sign-in from your mobile device",
  },
  passkey: {
    icon: Key,
    label: "Passkey",
    description: "Use a FIDO2 security key or platform authenticator",
  },
  biometric: {
    icon: Fingerprint,
    label: "Biometric Sign-in",
    description: "Use fingerprint or face recognition on your device",
  },
};

export function computePasswordStrength(
  password: string,
  config?: { minLength: number; maxLength: number; requireUppercase?: boolean; requireLowercase?: boolean; requireDigit?: boolean; requireSpecialChar?: boolean; specialChars?: string }
): { score: number; label: string; color: string; checks: { label: string; met: boolean }[] } {
  const checks: { label: string; met: boolean }[] = [];

  if (config) {
    checks.push({
      label: `At least ${config.minLength} characters`,
      met: password.length >= config.minLength,
    });
    if (config.requireUppercase) {
      checks.push({ label: "Uppercase letter", met: /[A-Z]/.test(password) });
    }
    if (config.requireLowercase) {
      checks.push({ label: "Lowercase letter", met: /[a-z]/.test(password) });
    }
    if (config.requireDigit) {
      checks.push({ label: "Number", met: /\d/.test(password) });
    }
    if (config.requireSpecialChar) {
      checks.push({
        label: "Special character",
        met: config.specialChars
          ? config.specialChars.split("").some((c) => password.includes(c))
          : /[^a-zA-Z0-9]/.test(password),
      });
    }
  } else {
    checks.push({ label: "At least 8 characters", met: password.length >= 8 });
    checks.push({ label: "Uppercase letter", met: /[A-Z]/.test(password) });
    checks.push({ label: "Lowercase letter", met: /[a-z]/.test(password) });
    checks.push({ label: "Number", met: /\d/.test(password) });
    checks.push({ label: "Special character", met: /[^a-zA-Z0-9]/.test(password) });
  }

  const metCount = checks.filter((c) => c.met).length;
  const ratio = checks.length > 0 ? metCount / checks.length : 0;

  if (ratio <= 0.25) return { score: 25, label: "Weak", color: "bg-red-500", checks };
  if (ratio <= 0.5) return { score: 50, label: "Fair", color: "bg-orange-500", checks };
  if (ratio <= 0.75) return { score: 75, label: "Good", color: "bg-yellow-500", checks };
  return { score: 100, label: "Strong", color: "bg-green-500", checks };
}

export function detectDevice() {
  const ua = navigator.userAgent;
  let browser = "Unknown Browser";
  let os = "Unknown OS";

  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";

  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  return {
    userAgent: ua,
    platform: "web" as const,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    defaultName: `${browser} on ${os}`,
  };
}

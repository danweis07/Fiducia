import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

// Mock gateway
vi.mock("@/lib/gateway", () => ({
  gateway: { request: vi.fn().mockResolvedValue({}) },
}));

// Mock i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "settings.title": "Settings",
        "settings.subtitle": "Manage your account preferences",
        "settings.profile": "Profile",
        "settings.profileDesc": "Update your personal information",
        "settings.firstName": "First Name",
        "settings.lastName": "Last Name",
        "settings.email": "Email",
        "settings.emailHelp": "Contact support to change your email",
        "settings.phone": "Phone",
        "settings.saveChanges": "Save Changes",
        "settings.security": "Security",
        "settings.securityDesc": "Manage your security settings",
        "settings.twoFactor": "Two-Factor Authentication",
        "settings.twoFactorDesc": "Add an extra layer of security",
        "settings.biometric": "Biometric Login",
        "settings.biometricDesc": "Use fingerprint or face recognition",
        "settings.changePassword": "Change Password",
        "settings.notifications": "Notifications",
        "settings.notificationsDesc": "Configure how you receive alerts",
        "settings.language": "Language",
        "settings.languageDesc": "Choose your preferred language",
        "settings.appearance": "Appearance",
        "settings.appearanceDesc": "Customize theme and display",
      };
      return map[key] ?? key;
    },
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

// Mock AppShell
vi.mock("@/components/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) =>
    createElement("div", { "data-testid": "app-shell" }, children),
}));

// Mock ThemeSelector and LanguageSelector
vi.mock("@/components/common/ThemeSelector", () => ({
  ThemeSelector: () => createElement("div", null, "Theme Selector"),
}));
vi.mock("@/components/common/LanguageSelector", () => ({
  LanguageSelector: () => createElement("div", null, "Language Selector"),
}));

// Mock hooks
const mockMutate = { mutateAsync: vi.fn(), isPending: false };

vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({
    data: {
      user: { firstName: "John", lastName: "Doe", email: "john@test.com", phone: "555-0100" },
    },
    isLoading: false,
  }),
  useUpdateProfile: () => mockMutate,
}));

vi.mock("@/hooks/useMemberProfile", () => ({
  useMemberAddresses: () => ({ data: { addresses: [] }, isLoading: false }),
  useMemberDocuments: () => ({ data: { documents: [] }, isLoading: false }),
  useMemberIdentifiers: () => ({ data: { identifiers: [] }, isLoading: false }),
}));

vi.mock("@/hooks/useNotificationPreferences", () => ({
  useNotificationPreferences: () => ({ data: null, isLoading: false }),
  useUpdateNotificationPreferences: () => mockMutate,
  useTestNotification: () => mockMutate,
}));

vi.mock("@/hooks/useSessions", () => ({
  useSessions: () => ({ data: { sessions: [] }, isLoading: false }),
  useRevokeSession: () => mockMutate,
  useRevokeAllSessions: () => mockMutate,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useErrorHandler", () => ({
  useErrorHandler: () => ({ handleError: vi.fn() }),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

describe("Settings page", () => {
  it("renders without crashing", async () => {
    const { default: Settings } = await import("../Settings");
    const { container } = render(createElement(Settings), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it("displays the Settings heading", async () => {
    const { default: Settings } = await import("../Settings");
    render(createElement(Settings), { wrapper: createWrapper() });
    expect(screen.getByText("Settings")).toBeTruthy();
  });

  it("displays profile section", async () => {
    const { default: Settings } = await import("../Settings");
    render(createElement(Settings), { wrapper: createWrapper() });
    // Profile appears in tab trigger and card title
    expect(screen.getAllByText("Profile").length).toBeGreaterThanOrEqual(1);
  });

  it("displays security section", async () => {
    const { default: Settings } = await import("../Settings");
    render(createElement(Settings), { wrapper: createWrapper() });
    expect(screen.getByText("Security")).toBeTruthy();
  });

  it("renders tab triggers for all 4 tabs", async () => {
    const { default: Settings } = await import("../Settings");
    render(createElement(Settings), { wrapper: createWrapper() });
    // Profile and Security may appear in both tab triggers and card content,
    // so use getAllByText to allow multiple matches
    expect(screen.getAllByText("Profile").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Security").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Notifications").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Appearance").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the appearance tab content label", async () => {
    const { default: Settings } = await import("../Settings");
    render(createElement(Settings), { wrapper: createWrapper() });
    expect(screen.getByText("Appearance")).toBeTruthy();
  });
});

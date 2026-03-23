import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useAccounts", () => ({
  useAccounts: vi.fn(() => ({ data: { accounts: [] }, isLoading: false })),
}));

vi.mock("@/hooks/useJointAccounts", () => ({
  useJointOwners: vi.fn(() => ({ data: { owners: [] }, isLoading: false })),
  useAddJointOwner: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useRemoveJointOwner: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateJointOwnerPermissions: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  usePendingInvitations: vi.fn(() => ({ data: { invitations: [] }, isLoading: false })),
  useAcceptInvitation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeclineInvitation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useJointAccountSummary: vi.fn(() => ({ data: { summary: null } })),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

vi.mock("@/hooks/useErrorHandler", () => ({
  useErrorHandler: vi.fn(() => ({ handleError: vi.fn() })),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, null, children));
}

describe("JointAccounts", () => {
  it("renders without crashing", async () => {
    const { default: JointAccounts } = await import("../JointAccounts");
    const { container } = render(createElement(JointAccounts), { wrapper: createWrapper() });
    expect(container).toBeTruthy();
  });

  it("shows the page heading", async () => {
    const { default: JointAccounts } = await import("../JointAccounts");
    render(createElement(JointAccounts), { wrapper: createWrapper() });
    expect(screen.getByText("Joint Account Management")).toBeTruthy();
  });

  it("shows account owners section", async () => {
    const { default: JointAccounts } = await import("../JointAccounts");
    render(createElement(JointAccounts), { wrapper: createWrapper() });
    expect(screen.getByText("Account Owners")).toBeTruthy();
  });
});

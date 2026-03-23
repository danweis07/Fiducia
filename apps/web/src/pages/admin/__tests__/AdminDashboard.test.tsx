import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("recharts", () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import AdminDashboard from "../AdminDashboard";

describe("AdminDashboard", () => {
  it("renders dashboard metrics", () => {
    render(<AdminDashboard />);
    expect(screen.getByText("Total Customers")).toBeTruthy();
  });
});

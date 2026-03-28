import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CMSBanner, CMSBannerList } from "../CMSBanner";
import type { CMSContent } from "@/types/admin";

const mockContent: CMSContent = {
  id: "banner-1",
  title: "System Maintenance",
  body: "Scheduled downtime this weekend.",
  contentType: "announcement",
  status: "published",
  slug: "system-maintenance",
  channels: [],
  metadata: {},
  locale: "en",
  authorId: null,
  publishedAt: null,
  scheduledAt: null,
  expiresAt: null,
  version: 1,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  localStorage.clear();
});

describe("CMSBanner", () => {
  it("renders banner title and body", () => {
    render(<CMSBanner content={mockContent} />);
    expect(screen.getByText("System Maintenance")).toBeTruthy();
    expect(screen.getByText("Scheduled downtime this weekend.")).toBeTruthy();
  });

  it("renders dismiss button when dismissible", () => {
    render(<CMSBanner content={mockContent} dismissible />);
    expect(screen.getByLabelText("Dismiss")).toBeTruthy();
  });

  it("hides banner after dismiss is clicked", () => {
    const onDismiss = vi.fn();
    const { container } = render(
      <CMSBanner content={mockContent} dismissible onDismiss={onDismiss} />,
    );
    fireEvent.click(screen.getByLabelText("Dismiss"));
    expect(onDismiss).toHaveBeenCalledWith("banner-1");
    // After dismiss, component returns null
    expect(container.innerHTML).toBe("");
  });

  it("does not render dismiss button when not dismissible", () => {
    render(<CMSBanner content={mockContent} dismissible={false} />);
    expect(screen.queryByLabelText("Dismiss")).toBeNull();
  });
});

describe("CMSBannerList", () => {
  it("renders nothing for empty items", () => {
    const { container } = render(<CMSBannerList items={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders multiple banners", () => {
    const items: CMSContent[] = [
      { ...mockContent, id: "b1", title: "Banner One" },
      { ...mockContent, id: "b2", title: "Banner Two" },
    ];
    render(<CMSBannerList items={items} />);
    expect(screen.getByText("Banner One")).toBeTruthy();
    expect(screen.getByText("Banner Two")).toBeTruthy();
  });
});

import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn utility", () => {
  it("merges class names", () => {
    const result = cn("foo", "bar");
    expect(result).toContain("foo");
    expect(result).toContain("bar");
  });

  it("handles conditional classes", () => {
    const isHidden = false;
    const result = cn("base", isHidden && "hidden", "visible");
    expect(result).toContain("base");
    expect(result).toContain("visible");
    expect(result).not.toContain("hidden");
  });

  it("merges tailwind classes properly", () => {
    const result = cn("px-2 py-1", "px-4");
    expect(result).toContain("px-4");
    expect(result).not.toContain("px-2");
  });

  it("handles undefined and null", () => {
    const result = cn("base", undefined, null);
    expect(result).toBe("base");
  });

  it("handles empty input", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("handles arrays of classes", () => {
    const result = cn(["foo", "bar"]);
    expect(result).toContain("foo");
    expect(result).toContain("bar");
  });
});

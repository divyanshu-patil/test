import { describe, expect, it } from "vitest";
import { captionParts, frameRatio, relativeTime } from "./format";
import { parseError } from "./api";
import { safeNext } from "@/features/auth/safe-next";
import { validateFiles } from "@/features/posts/validate";

describe("captionParts", () => {
  it("splits hashtags without producing HTML", () => {
    expect(captionParts("sunset #golden_hour at <b>beach</b> #2026")).toEqual([
      { text: "sunset ", tag: false },
      { text: "#golden_hour", tag: true },
      { text: " at <b>beach</b> ", tag: false },
      { text: "#2026", tag: true },
    ]);
  });
});

describe("frameRatio", () => {
  it("clamps between 4:5 and 1.91:1", () => {
    expect(frameRatio(1000, 3000)).toBe(0.8);
    expect(frameRatio(4000, 1000)).toBe(1.91);
    expect(frameRatio(800, 600)).toBeCloseTo(4 / 3);
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-01-10T12:00:00Z");
  it("formats recent and older times", () => {
    expect(relativeTime("2026-01-10T11:59:50Z", now)).toBe("just now");
    expect(relativeTime("2026-01-10T09:00:00Z", now)).toBe("3 hr. ago");
    expect(relativeTime("2026-01-08T12:00:00Z", now)).toBe("2 days ago");
  });
});

describe("safeNext", () => {
  it("blocks open redirects", () => {
    expect(safeNext("/create")).toBe("/create");
    expect(safeNext("//evil.com")).toBe("/feed");
    expect(safeNext("/\\evil.com")).toBe("/feed");
    expect(safeNext("https://evil.com")).toBe("/feed");
    expect(safeNext(null)).toBe("/feed");
  });
});

describe("parseError", () => {
  it("maps FastAPI 422 details to fields", () => {
    const e = parseError(422, { detail: [{ loc: ["body", "username"], msg: "Value error, too short" }] });
    expect(e.fields).toEqual({ username: "too short" });
    expect(e.message).toBe("too short");
  });
  it("keeps string details", () => {
    expect(parseError(409, { detail: "That username is taken." }).message).toBe("That username is taken.");
  });
});

describe("validateFiles", () => {
  const file = (name: string, type: string, size = 100) => new File([new Uint8Array(size)], name, { type });
  it("rejects wrong types, oversize files, and too many files", () => {
    const { ok, errors } = validateFiles(9, [
      file("a.png", "image/png"),
      file("doc.pdf", "application/pdf"),
      file("big.jpg", "image/jpeg", 11 * 1024 * 1024),
      file("b.png", "image/png"),
    ]);
    expect(ok.map((f) => f.name)).toEqual(["a.png"]);
    expect(errors).toHaveLength(3);
  });
});

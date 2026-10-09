import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PostActions } from "./post-actions";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const setup = () =>
  render(<PostActions postId="p1" initialLiked={false} initialCount={2} commentsOpen={false} onComment={() => {}} />);

describe("PostActions", () => {
  it("likes optimistically and settles on the server count", async () => {
    let resolve!: (r: Response) => void;
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise((r) => (resolve = r)));
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Like" }));
    expect(screen.getByRole("button", { name: "Unlike" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("3 likes")).toBeTruthy();
    await act(async () => resolve(new Response(JSON.stringify({ liked: true, like_count: 5 }), { status: 200 })));
    expect(screen.getByText("5 likes")).toBeTruthy();
    expect(vi.mocked(fetch).mock.calls[0]?.[1]?.method).toBe("PUT");
  });

  it("rolls back and shows an error when the request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ detail: "Too many requests." }), { status: 429 }));
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Like" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Too many requests.");
    expect(screen.getByRole("button", { name: "Like" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("2 likes")).toBeTruthy();
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RegisterForm, validateRegistration } from "./register-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
afterEach(cleanup);

describe("validateRegistration", () => {
  it("accepts valid input", () => {
    expect(validateRegistration({ email: "a@b.co", username: "Ana_1", password: "secret123", display_name: "" })).toEqual({});
  });
  it("flags invalid input", () => {
    const e = validateRegistration({ email: "nope", username: "a..b", password: "letters!", display_name: "" });
    expect(Object.keys(e).sort()).toEqual(["email", "password", "username"]);
  });
});

describe("RegisterForm", () => {
  it("shows inline errors and does not call the API when invalid", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<RegisterForm />);
    await userEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(screen.getByLabelText("Email").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows server-side field errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ detail: "That username is taken." }), { status: 409 }),
    );
    render(<RegisterForm />);
    await userEvent.type(screen.getByLabelText("Email"), "a@b.co");
    await userEvent.type(screen.getByLabelText("Username"), "taken");
    await userEvent.type(screen.getByLabelText("Password"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect((await screen.findByRole("alert")).textContent).toBe("That username is taken.");
  });
});

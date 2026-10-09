import { expect, type Page } from "@playwright/test";

export const PASSWORD = "secret123";

export function uniqueUser(prefix: string) {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return { username: `${prefix}_${id}`.slice(0, 30), email: `${prefix}_${id}@example.com` };
}

export async function register(page: Page, prefix = "e2e") {
  const u = uniqueUser(prefix);
  await page.goto("/register");
  await page.getByLabel("Email").fill(u.email);
  await page.getByLabel("Username").fill(u.username);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/feed$/);
  return u;
}

/** Minimal valid 1x1 PNG. */
export const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

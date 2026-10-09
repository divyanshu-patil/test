import { expect, test } from "@playwright/test";
import { register } from "./helpers";

test("mobile bottom navigation works without horizontal overflow", async ({ page }) => {
  await register(page, "mobile");
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav).toBeVisible();
  await nav.getByRole("link", { name: "Create" }).click();
  await expect(page.getByRole("heading", { name: "New post" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

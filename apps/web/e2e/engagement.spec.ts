import { expect, test } from "@playwright/test";
import { PNG, register } from "./helpers";

test("like and comment persist across reloads; comment can be deleted", async ({ page }) => {
  await register(page, "fan");
  await page.goto("/create");
  await page.locator('input[type="file"]').setInputFiles({ name: "a.png", mimeType: "image/png", buffer: PNG });
  const caption = `engage ${Date.now()}`;
  await page.getByLabel("Caption").fill(caption);
  await page.getByRole("button", { name: "Share" }).click();
  await expect(page).toHaveURL(/posted=1/);

  const card = page.getByRole("article").filter({ hasText: caption });
  await card.getByRole("button", { name: "Like" }).click();
  await expect(card.getByRole("button", { name: "Unlike" })).toHaveAttribute("aria-pressed", "true");
  await expect(card.getByText("1 like", { exact: true })).toBeVisible();

  await card.getByRole("button", { name: "Comment" }).click();
  await expect(card.getByLabel("Add a comment")).toBeFocused();
  await expect(card.getByText("No comments yet.", { exact: false })).toBeVisible();
  await card.getByLabel("Add a comment").fill("great shot");
  await card.getByRole("button", { name: "Post", exact: true }).click();
  await expect(card.getByRole("list", { name: "Comments" })).toContainText("great shot");
  await expect(card.getByLabel("Add a comment")).toHaveValue("");

  await page.reload();
  const again = page.getByRole("article").filter({ hasText: caption });
  await expect(again.getByRole("button", { name: "Unlike" })).toBeVisible();
  await expect(again.getByText("1 like", { exact: true })).toBeVisible();
  await again.getByRole("button", { name: "View 1 comment" }).click();
  await expect(again.getByRole("list", { name: "Comments" })).toContainText("great shot");

  await again.getByRole("button", { name: /Delete comment by/ }).click();
  await expect(again.getByRole("list", { name: "Comments" })).toHaveCount(0);
  await again.getByRole("button", { name: "Unlike" }).click();
  await expect(again.getByText("0 likes", { exact: true })).toBeVisible();
});

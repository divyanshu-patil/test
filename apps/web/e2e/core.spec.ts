import { expect, test } from "@playwright/test";
import { PASSWORD, PNG, register } from "./helpers";

test("protected routes redirect to login and back", async ({ page }) => {
  await page.goto("/create");
  await expect(page).toHaveURL(/\/login\?next=%2Fcreate$/);
});

test("registration shows validation errors", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Username").fill("a");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText(/3–30 characters/)).toBeVisible();
  await expect(page).toHaveURL(/\/register$/);
});

test("register, publish a post, see it in the feed, delete it, log out and back in", async ({ page }) => {
  const user = await register(page, "poster");

  await page.getByRole("link", { name: "Create" }).first().click();
  await expect(page.getByRole("heading", { name: "New post" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Share" })).toBeDisabled();

  await page.locator('input[type="file"]').setInputFiles([
    { name: "one.png", mimeType: "image/png", buffer: PNG },
    { name: "two.png", mimeType: "image/png", buffer: PNG },
  ]);
  await expect(page.getByRole("list", { name: "Selected photos" }).getByRole("listitem")).toHaveCount(2);
  await page.getByLabel("Alt text for photo 1").fill("first photo");
  await page.getByLabel("Alt text for photo 2").fill("second photo");
  await page.getByRole("button", { name: "Move photo 2 earlier" }).click();
  await expect(page.getByLabel("Alt text for photo 1")).toHaveValue("second photo");

  const caption = `Hello from e2e #playwright ${Date.now()}`;
  await page.getByLabel("Caption").fill(caption);
  await page.getByRole("button", { name: "Share" }).click();

  await expect(page).toHaveURL(/\/feed\?posted=1$/);
  await expect(page.getByText("Your post is live.")).toBeVisible();
  const card = page.getByRole("article").filter({ hasText: caption });
  await expect(card).toBeVisible();
  await expect(card.getByText("#playwright")).toBeVisible();
  await expect(card.getByAltText("second photo")).toBeVisible();

  await card.getByRole("button", { name: "Post options" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(card).toHaveCount(0);

  await page.getByRole("button", { name: "Log out" }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/feed");
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("Username or email").fill(user.email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/feed$/);
});

test("server rejects a fake image and the form keeps state for retry", async ({ page }) => {
  await register(page, "badfile");
  await page.goto("/create");
  await page.locator('input[type="file"]').setInputFiles({
    name: "fake.png",
    mimeType: "image/png",
    buffer: Buffer.from("definitely not an image"),
  });
  await page.getByLabel("Caption").fill("should fail");
  await page.getByRole("button", { name: "Share" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "not a valid image" })).toBeVisible();
  await expect(page.getByLabel("Caption")).toHaveValue("should fail");
  await expect(page.getByRole("button", { name: "Retry" })).toBeEnabled();
});

test("other users' posts have no delete control", async ({ page, browser }) => {
  await register(page, "owner");
  await page.goto("/create");
  await page.locator('input[type="file"]').setInputFiles({ name: "a.png", mimeType: "image/png", buffer: PNG });
  const caption = `owned ${Date.now()}`;
  await page.getByLabel("Caption").fill(caption);
  await page.getByRole("button", { name: "Share" }).click();
  await expect(page).toHaveURL(/posted=1/);

  const other = await browser.newPage();
  await register(other, "viewer");
  const card = other.getByRole("article").filter({ hasText: caption });
  await expect(card).toBeVisible();
  await expect(card.getByRole("button", { name: "Post options" })).toHaveCount(0);
  await other.close();
});

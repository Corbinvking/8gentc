import { test, expect } from "@playwright/test";

test.describe("Workspace", () => {
  test.skip("workspace home shows graph view", async ({ page }) => {
    // Requires authenticated session
    await page.goto("/");
    await expect(page.locator("text=Workspace")).toBeVisible();
  });

  test.skip("can navigate to notes page", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Notes");
    await expect(page).toHaveURL(/notes/);
  });

  test.skip("can navigate to agents page", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Agents");
    await expect(page).toHaveURL(/agents/);
  });

  test.skip("can navigate to settings page", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Settings");
    await expect(page).toHaveURL(/settings/);
  });
});

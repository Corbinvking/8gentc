import { test, expect } from "@playwright/test";

test.describe("Chat", () => {
  test.skip("chat page shows input area", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.locator("text=Chat")).toBeVisible();
    await expect(
      page.locator('textarea[placeholder="Type a message..."]')
    ).toBeVisible();
  });

  test.skip("chat shows empty state when no messages", async ({ page }) => {
    await page.goto("/chat");
    await expect(
      page.locator("text=Start a conversation")
    ).toBeVisible();
  });
});

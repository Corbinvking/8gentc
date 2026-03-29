import { test, expect } from "@playwright/test";

test.describe("Billing", () => {
  test.skip("billing page shows plan cards", async ({ page }) => {
    await page.goto("/settings/billing");
    await expect(page.locator("text=Billing & Subscription")).toBeVisible();
    await expect(page.locator("text=Free")).toBeVisible();
    await expect(page.locator("text=Individual")).toBeVisible();
    await expect(page.locator("text=Pro")).toBeVisible();
    await expect(page.locator("text=Enterprise")).toBeVisible();
  });

  test.skip("can see usage dashboard", async ({ page }) => {
    await page.goto("/settings/billing");
    await expect(
      page.locator("text=Runtime Hours This Period")
    ).toBeVisible();
  });
});

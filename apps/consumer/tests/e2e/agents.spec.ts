import { test, expect } from "@playwright/test";

test.describe("Agents", () => {
  test.skip("agent creation wizard has three steps", async ({ page }) => {
    await page.goto("/agents/new");
    await expect(page.locator("text=Create Agent")).toBeVisible();
    await expect(page.locator("text=Choose a template")).toBeVisible();
  });

  test.skip("can select an agent template", async ({ page }) => {
    await page.goto("/agents/new");
    await page.click("text=Research Agent");
    await expect(page.locator("text=Configure your agent")).toBeVisible();
  });

  test.skip("agents list shows empty state", async ({ page }) => {
    await page.goto("/agents");
    await expect(page.locator("text=No agents yet")).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";

test.describe("Contractor Onboarding", () => {
  test("sign-in page renders", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByText("8gent")).toBeVisible();
    await expect(page.getByText("Sign in to your contractor account")).toBeVisible();
  });

  test("sign-up page renders", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByText("8gent")).toBeVisible();
    await expect(page.getByText("Create your contractor account")).toBeVisible();
  });

  test("registration page loads with step 1", async ({ page }) => {
    await page.goto("/onboarding/register");
    await expect(page.getByText("Personal Information")).toBeVisible();
    await expect(page.getByText("Step 1 of 5")).toBeVisible();
  });

  test("onboarding status page renders pipeline", async ({ page }) => {
    await page.goto("/onboarding/status");
    await expect(page.getByText("Application Status")).toBeVisible();
  });
});

test.describe("Task Marketplace", () => {
  test("tasks page shows available/active tabs", async ({ page }) => {
    await page.goto("/tasks");
    await expect(page.getByText("Tasks")).toBeVisible();
    await expect(page.getByText("Available")).toBeVisible();
    await expect(page.getByText("Active")).toBeVisible();
  });
});

test.describe("Dashboard", () => {
  test("dashboard renders stat cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Active Tasks")).toBeVisible();
    await expect(page.getByText("Composite Score")).toBeVisible();
  });
});

test.describe("Schedule", () => {
  test("schedule page renders with Go Online button", async ({ page }) => {
    await page.goto("/schedule");
    await expect(page.getByText("Schedule")).toBeVisible();
    await expect(page.getByText("Go Online")).toBeVisible();
  });
});

test.describe("Performance", () => {
  test("performance page renders score cards", async ({ page }) => {
    await page.goto("/performance");
    await expect(page.getByText("Performance")).toBeVisible();
    await expect(page.getByText("Composite Score")).toBeVisible();
  });
});

test.describe("Earnings", () => {
  test("earnings page renders with payout info", async ({ page }) => {
    await page.goto("/earnings");
    await expect(page.getByText("Earnings")).toBeVisible();
    await expect(page.getByText("Payout History")).toBeVisible();
  });
});

test.describe("Leaderboard", () => {
  test("leaderboard page renders with scope toggle", async ({ page }) => {
    await page.goto("/leaderboard");
    await expect(page.getByText("Leaderboard")).toBeVisible();
    await expect(page.getByText("My Tier")).toBeVisible();
    await expect(page.getByText("Global")).toBeVisible();
  });
});

import { expect, test } from "@playwright/test";

test("built preview renders the collection at its trailing-slash route", async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:4173/collection/");

  await expect(page).toHaveTitle("Snowflake Studio — Collection");
  await expect(page.getByText("No saved snowflakes yet.")).toBeVisible();

  await page.close();
});

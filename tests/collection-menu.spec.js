import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/index.html");
  await page.locator("#randomCutBtn").click();
  await page.locator("#saveToCollectionBtn").click();
  await expect(page.locator("#saveToCollectionBtn")).toBeDisabled();
});

async function expectMenuWithinViewport(page) {
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await expect.poll(() => menu.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.left >= 8 && rect.right <= document.documentElement.clientWidth - 8
      && rect.top >= 8 && rect.bottom <= document.documentElement.clientHeight - 8;
  })).toBe(true);

  for (const name of ["Print instructions", "Save instructions"]) {
    const item = menu.getByRole("menuitem", { name, exact: true });
    await expect(item).toBeInViewport({ ratio: 1 });
    await item.click({ trial: true });
  }
}

for (const width of [320, 390, 768, 1200]) {
  test(`Collection More menu stays on screen at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 568 });
    await page.goto("/collection.html");
    const moreButton = page.getByRole("button", { name: "More", exact: true });

    await moreButton.click();
    await expectMenuWithinViewport(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(moreButton).toHaveAttribute("aria-expanded", "false");

    await moreButton.click();
    await expectMenuWithinViewport(page);
  });
}

test("open Collection More menu stays on screen after resizing", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 568 });
  await page.goto("/collection.html");
  await page.getByRole("button", { name: "More", exact: true }).click();
  await expectMenuWithinViewport(page);

  for (const width of [320, 768, 1200, 320]) {
    await page.setViewportSize({ width, height: 568 });
    await expectMenuWithinViewport(page);
  }
});

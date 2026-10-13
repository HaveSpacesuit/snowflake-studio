import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`saved design stays saved after refresh at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/index.html");

    const saveButton = page.locator("#saveToCollectionBtn");
    const randomCutButton = page.locator("#randomCutBtn");
    const readState = () => page.evaluate(() => ({
      active: JSON.parse(localStorage.getItem("snowflakeStudio.active.v1")),
      collection: JSON.parse(localStorage.getItem("snowflakeStudio.collection.v1"))
    }));
    const signature = ({ paperGeom, options }) => JSON.stringify({ paperGeom, options });

    await expect(saveButton).toBeDisabled();
    await randomCutButton.click();
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(saveButton).toBeDisabled();
    const firstSaved = (await readState()).collection[0];

    await randomCutButton.click();
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(saveButton).toBeDisabled();
    const saved = await readState();
    expect(saved.collection).toHaveLength(2);
    expect(saved.collection[1]).toEqual(firstSaved);
    expect(saved.collection[0].id).not.toBe(firstSaved.id);
    expect(signature(saved.collection[0])).not.toBe(signature(firstSaved));

    await page.setViewportSize(viewport);
    await page.reload();
    await expect(page.locator("#status")).toHaveText("Restored previous snowflake.");
    await expect(saveButton).toBeDisabled();
    if (viewport.width === 390) {
      await page.getByRole("button", { name: "More", exact: true }).click();
      await expect(page.getByRole("menuitem", { name: "Save to collection", exact: true })).toBeDisabled();
      await page.keyboard.press("Escape");
    }
    const restored = await readState();
    expect(restored.collection).toEqual(saved.collection);
    expect(signature(restored.active)).toBe(signature(saved.collection[0]));
    expect(restored.active.lastCollectionSavedSignature).toBe(signature(restored.active));

    await randomCutButton.click();
    await expect(saveButton).toBeEnabled();
    await page.reload();
    await expect(page.locator("#status")).toHaveText("Restored previous snowflake.");
    await expect(saveButton).toBeEnabled();
    await page.locator("#undoBtn").click();
    await expect(saveButton).toBeDisabled();
    await page.locator("#redoBtn").click();
    await expect(saveButton).toBeEnabled();
    expect((await readState()).collection).toEqual(saved.collection);
  });
}

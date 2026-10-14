import { test, expect } from "@playwright/test";

test.describe("touch tool tooltips", () => {
  test.use({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true
  });

  test("long-press tooltip stays visible after release until the hide delay expires", async ({ page }) => {
    await page.goto("/index.html");
    expect(await page.evaluate(() => matchMedia("(hover: none) and (pointer: coarse)").matches)).toBe(true);

    const button = page.getByRole("button", { name: "Freehand tool", exact: true });
    const tooltip = button.locator(".verticalToolRailTooltip");
    await button.scrollIntoViewIfNeeded();
    const box = await button.boundingBox();
    if (!box) throw new Error("Freehand button was not rendered");
    const session = await page.context().newCDPSession(page);

    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }]
    });
    await page.waitForTimeout(600);
    await expect(button).toHaveClass(/is-touch-tooltip-open/);
    await expect(tooltip).toHaveCSS("opacity", "1");
    await expect(tooltip).toHaveCSS("visibility", "visible");

    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    // Reproduce sticky touch hover consistently across Chromium versions.
    await button.hover();
    expect(await button.evaluate((element) => element.matches(":hover"))).toBe(true);
    for (const delay of [80, 300, 620]) {
      await page.waitForTimeout(delay);
      await expect(button).toHaveClass(/is-touch-tooltip-open/);
      const style = await tooltip.evaluate((element) => {
        const computed = getComputedStyle(element);
        return { opacity: computed.opacity, visibility: computed.visibility };
      });
      expect(style).toEqual({ opacity: "1", visibility: "visible" });
    }

    await expect(button).not.toHaveClass(/is-touch-tooltip-open/);
    await expect(tooltip).toHaveCSS("opacity", "0");
    await expect(tooltip).toHaveCSS("visibility", "hidden");
    await session.detach();
  });

  test("a short tap does not leave a tooltip visible", async ({ page }) => {
    await page.goto("/index.html");
    const button = page.getByRole("button", { name: "Freehand tool", exact: true });
    await button.tap();
    await expect(button).not.toHaveClass(/is-touch-tooltip-open/);
    await expect(button.locator(".verticalToolRailTooltip")).toHaveCSS("opacity", "0");
    await expect(button.locator(".verticalToolRailTooltip")).toHaveCSS("visibility", "hidden");
  });

  test("switching tools dismisses the previous long-press tooltip", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/index.html");
    const freehand = page.getByRole("button", { name: "Freehand tool", exact: true });
    const straight = page.getByRole("button", { name: "Straight tool", exact: true });
    const tooltip = freehand.locator(".verticalToolRailTooltip");
    await freehand.scrollIntoViewIfNeeded();
    const box = await freehand.boundingBox();
    if (!box) throw new Error("Freehand button was not rendered");
    const session = await page.context().newCDPSession(page);

    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }]
    });
    await page.waitForTimeout(600);
    await expect(freehand).toHaveClass(/is-touch-tooltip-open/);
    await expect(tooltip).toHaveCSS("opacity", "1");
    await expect(tooltip).toHaveCSS("visibility", "visible");
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await straight.tap();

    await expect(straight).toHaveAttribute("aria-pressed", "true");
    await expect(freehand).toHaveAttribute("aria-pressed", "false");
    for (const delay of [250, 1800]) {
      await page.waitForTimeout(delay);
      expect(await freehand.getAttribute("class")).not.toMatch(/is-touch-tooltip-open/);
      const style = await tooltip.evaluate((element) => {
        const computed = getComputedStyle(element);
        return { opacity: computed.opacity, visibility: computed.visibility };
      });
      expect(style).toEqual({ opacity: "0", visibility: "hidden" });
    }
    await session.detach();
  });
});

test("desktop tooltips remain available on hover and keyboard focus", async ({ page }) => {
  await page.goto("/index.html");
  const button = page.getByRole("button", { name: "Freehand tool", exact: true });
  const tooltip = button.locator(".verticalToolRailTooltip");

  await button.hover();
  await expect(tooltip).toHaveCSS("opacity", "1");
  await expect(tooltip).toHaveCSS("visibility", "visible");
  await page.mouse.move(0, 0);
  await expect(tooltip).toHaveCSS("visibility", "hidden");

  await page.keyboard.press("Tab");
  await button.focus();
  await expect(tooltip).toHaveCSS("opacity", "1");
  await expect(tooltip).toHaveCSS("visibility", "visible");
});

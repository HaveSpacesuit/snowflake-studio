import { test, expect } from "@playwright/test";

async function expectFocusCycle(page, controls) {
  await expect(controls[0]).toBeFocused();
  for (let cycle = 0; cycle < 2; cycle += 1) {
    for (let index = 0; index < controls.length; index += 1) {
      await page.keyboard.press("Tab");
      await expect(controls[(index + 1) % controls.length]).toBeFocused();
    }
    for (let index = controls.length - 1; index >= 0; index -= 1) {
      await page.keyboard.press("Shift+Tab");
      await expect(controls[index]).toBeFocused();
    }
  }
}

const dialogs = [
  {
    name: "Help",
    launcher: "#helpBtn",
    controls: [".helpCloseButton", ".helpFooter a"],
    closeButtons: [".helpCloseButton"]
  },
  {
    name: "Options",
    launcher: "#optionsBtn",
    controls: [
      "#optionsPreviewModeInput",
      "#optionsExteriorColorInput",
      "#optionsExteriorWidthInput",
      "#optionsInteriorColorInput",
      "#optionsInteriorWidthInput",
      "#optionsBodyColorInput",
      "#optionsSideCountInput",
      "#printPaperSize",
      "#optionsExpandToFillInput",
      "#optionsRestoreDefaultsBtn",
      "#optionsCancelBtn",
      "#optionsSaveBtn"
    ],
    closeButtons: ["#optionsCancelBtn", "#optionsSaveBtn"]
  },
  {
    name: "Studio confirmation",
    launcher: "#resetBtn",
    controls: ["button[value='cancel']", "#collectionConfirmOk"],
    closeButtons: ["button[value='cancel']", "#collectionConfirmOk"],
    prepare: async (page) => {
      await page.locator("#randomCutBtn").click();
      await expect(page.locator("#undoBtn")).toBeEnabled();
    }
  },
  {
    name: "Collection confirmation",
    launcher: "#clearCollectionBtn",
    controls: ["button[value='cancel']", "#collectionConfirmOk"],
    closeButtons: ["button[value='cancel']", "#collectionConfirmOk"],
    prepare: async (page) => {
      await page.evaluate(() => {
        localStorage.setItem(
          "snowflakeStudio.collection.v1",
          JSON.stringify([{ id: "focus-test", svg: "<svg></svg>", createdAt: 1 }])
        );
      });
      await page.goto("/collection.html");
    }
  }
];

for (const { name, launcher, controls, closeButtons, prepare } of dialogs) {
  test(`${name} traps Tab and Shift+Tab and restores focus after closing`, async ({ page }) => {
    await page.goto("/index.html");
    const launchingControl = page.locator(launcher);
    const dialog = page.locator("dialog[open]");

    for (const closeMethod of ["Escape", "Escape event", "cancel event", "backdrop", ...closeButtons]) {
      if (prepare) await prepare(page);
      await launchingControl.click();
      await expect(dialog).toBeVisible();
      await expectFocusCycle(page, controls.map((selector) => dialog.locator(selector)));

      if (closeMethod === "Escape") {
        await page.keyboard.press("Escape");
      } else if (closeMethod === "Escape event") {
        await dialog.dispatchEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
      } else if (closeMethod === "cancel event") {
        await dialog.dispatchEvent("cancel", { cancelable: true });
      } else if (closeMethod === "backdrop") {
        await page.mouse.click(5, 5);
      } else {
        await dialog.locator(closeMethod).click();
      }
      await expect(dialog).toHaveCount(0);
      await expect(launchingControl).toBeFocused();
    }
  });
}

test("Escape discards live and staged Options changes", async ({ page }) => {
  await page.goto("/index.html");
  await page.locator("#randomCutBtn").click();
  const launcher = page.locator("#optionsBtn");
  await launcher.click();
  const mode = page.locator("#optionsPreviewModeInput");
  const initialMode = await mode.inputValue();
  const sideCount = page.locator("#optionsSideCountInput");
  const initialSideCount = await sideCount.inputValue();
  const paperSize = page.locator("#printPaperSize");
  const initialPaperSize = await paperSize.inputValue();
  const expandToFill = page.locator("#optionsExpandToFillInput");
  const initialExpandToFill = await expandToFill.isChecked();

  await mode.fill(initialMode === "2" ? "0" : "2");
  await sideCount.fill(initialSideCount === "7" ? "6" : "7");
  await paperSize.selectOption(initialPaperSize === "letter" ? "a4" : "letter");
  await expandToFill.setChecked(!initialExpandToFill);
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(launcher).toBeFocused();
  await expect(page.locator("#undoBtn")).toBeEnabled();

  await launcher.click();
  await expect(mode).toHaveValue(initialMode);
  await expect(sideCount).toHaveValue(initialSideCount);
  await expect(paperSize).toHaveValue(initialPaperSize);
  await expect(expandToFill).toBeChecked({ checked: initialExpandToFill });
});

test("Escape cancels New after a previous confirmation", async ({ page }) => {
  await page.goto("/index.html");
  await page.locator("#randomCutBtn").click();
  const launcher = page.locator("#resetBtn");
  await launcher.click();
  await page.locator("#collectionConfirmOk").click();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(page.locator("#undoBtn")).toBeDisabled();

  await page.locator("#randomCutBtn").click();
  await expect(page.locator("#undoBtn")).toBeEnabled();
  await launcher.click();
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(launcher).toBeFocused();
  await expect(page.locator("#undoBtn")).toBeEnabled();
});

test("Options focus cycle updates when controls become enabled or disabled", async ({ page }) => {
  await page.goto("/index.html");
  await page.locator("#optionsBtn").click();
  const dialog = page.locator("dialog[open]");
  const mode = dialog.locator("#optionsPreviewModeInput");

  await mode.fill("2");
  await expect(dialog.locator("#optionsExteriorColorInput")).toBeDisabled();
  await expect(dialog.locator("#optionsBodyColorInput")).toBeEnabled();
  await mode.focus();
  await expectFocusCycle(page, [
    mode,
    dialog.locator("#optionsBodyColorInput"),
    ...dialogs[1].controls.slice(6).map((selector) => dialog.locator(selector))
  ]);

  await mode.fill("1");
  await expect(dialog.locator("#optionsExteriorColorInput")).toBeEnabled();
  await mode.focus();
  const controls = dialogs[1].controls.map((selector) => dialog.locator(selector));
  await expectFocusCycle(page, controls);
});

test("dialog focus stays contained with one or no tabbable controls", async ({ page }) => {
  await page.goto("/index.html");
  await page.locator("#helpBtn").click();
  const dialog = page.locator("dialog[open]");
  const close = dialog.locator(".helpCloseButton");
  await dialog.locator(".helpFooter a").evaluate((link) => { link.hidden = true; });
  await expectFocusCycle(page, [close]);

  await close.evaluate((button) => { button.disabled = true; });
  await dialog.focus();
  for (const key of ["Tab", "Shift+Tab"]) {
    await page.keyboard.press(key);
    await expect(dialog).toBeFocused();
  }
  await page.keyboard.press("Escape");
  await expect(page.locator("#helpBtn")).toBeFocused();
});

test("Studio and help dialog fit a narrow zoom-equivalent viewport", async ({ page }) => {
  for (const width of [240, 200]) {
    await page.setViewportSize({ width, height: 180 });
    await page.goto("/index.html");

    await expect.poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);

    await page.locator("#helpBtn").click();
    const dialog = page.locator('dialog[open][aria-labelledby="helpModalTitle"]');
    await expect(dialog).toBeVisible();

    const dimensions = await dialog.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);

    await dialog.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await expect.poll(() => dialog.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expect.poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
  }
});

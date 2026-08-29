import { test, expect } from "@playwright/test";

const appUrl = "/index.html";

function statusIsAccepted(statusText) {
  return /^Accepted \(/.test(statusText) || /^Cut accepted \(/.test(statusText);
}

function statusIsRejected(statusText) {
  return /^Rejected:/.test(statusText);
}

async function reset(page) {
  await page.goto(appUrl);
  await page.locator("#resetBtn").click();
}

async function panelSize(locator) {
  return await locator.evaluate((el) => {
    const widthAttr = Number(el.getAttribute("width"));
    const heightAttr = Number(el.getAttribute("height"));
    if (Number.isFinite(widthAttr) && widthAttr > 0 && Number.isFinite(heightAttr) && heightAttr > 0) {
      return { width: widthAttr, height: heightAttr };
    }

    if (typeof el.width === "number" && typeof el.height === "number") {
      return { width: el.width, height: el.height };
    }

    if (el.viewBox && el.viewBox.baseVal) {
      return { width: el.viewBox.baseVal.width, height: el.viewBox.baseVal.height };
    }

    return { width: 520, height: 520 };
  });
}

async function foldedRotation(page) {
  const value = await page.locator("#foldedCanvas").getAttribute("data-folded-rotation");
  return Number(value || String(Math.PI / 6));
}

function rotatePoint(point, angle, center = { x: 260, y: 260 }) {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  return {
    x: center.x + dx * ca - dy * sa,
    y: center.y + dx * sa + dy * ca
  };
}

async function foldedPointToPage(page, box, intrinsic, point) {
  const rotation = await foldedRotation(page);
  const rotated = rotatePoint(point, rotation);
  return {
    x: box.x + (rotated.x / intrinsic.width) * box.width,
    y: box.y + (rotated.y / intrinsic.height) * box.height
  };
}

async function drawPath(page, points) {
  const canvas = page.locator("#foldedCanvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Folded canvas not found");

  const intrinsic = await panelSize(canvas);
  const toPage = (p) => foldedPointToPage(page, box, intrinsic, p);

  const start = await toPage(points[0]);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();

  for (let i = 1; i < points.length; i += 1) {
    const next = await toPage(points[i]);
    await page.mouse.move(next.x, next.y);
  }

  await page.mouse.up();
  return (await page.locator("#status").textContent()) || "";
}

async function drawShiftLine(page, start, end) {
  const canvas = page.locator("#foldedCanvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Folded canvas not found");

  const intrinsic = await panelSize(canvas);
  const toPage = (p) => foldedPointToPage(page, box, intrinsic, p);

  const p0 = await toPage(start);
  const p1 = await toPage(end);

  await page.mouse.move(p0.x, p0.y);
  await page.mouse.down();
  await page.keyboard.down("Shift");
  await page.mouse.move(p1.x, p1.y, { steps: 12 });
  await page.keyboard.up("Shift");
  await page.mouse.up();
  return (await page.locator("#status").textContent()) || "";
}

async function drawShiftLineWithWaypoints(page, start, waypoints) {
  const canvas = page.locator("#foldedCanvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Folded canvas not found");

  const intrinsic = await panelSize(canvas);
  const toPage = (p) => foldedPointToPage(page, box, intrinsic, p);

  const p0 = await toPage(start);
  await page.mouse.move(p0.x, p0.y);
  await page.mouse.down();
  await page.keyboard.down("Shift");

  for (const waypoint of waypoints) {
    const next = await toPage(waypoint);
    await page.mouse.move(next.x, next.y, { steps: 10 });
  }

  await page.mouse.up();
  await page.keyboard.up("Shift");
  return (await page.locator("#status").textContent()) || "";
}

async function drawPathWithAltHeldOnRelease(page, points) {
  const canvas = page.locator("#foldedCanvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Folded canvas not found");

  const intrinsic = await panelSize(canvas);
  const toPage = (p) => foldedPointToPage(page, box, intrinsic, p);

  const start = await toPage(points[0]);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();

  for (let i = 1; i < points.length; i += 1) {
    const next = await toPage(points[i]);
    await page.mouse.move(next.x, next.y);
  }

  await page.keyboard.down("Alt");
  await page.mouse.up();
  await page.keyboard.up("Alt");
  return (await page.locator("#status").textContent()) || "";
}

function toolButton(page, label) {
  return page.getByRole("button", { name: label, exact: true });
}

async function selectTool(page, label) {
  await toolButton(page, label).click();
}

async function clickFoldedPoint(page, point) {
  const canvas = page.locator("#foldedCanvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Folded canvas not found");

  const intrinsic = await panelSize(canvas);
  const target = await foldedPointToPage(page, box, intrinsic, point);
  await page.mouse.click(target.x, target.y);
}

async function whitePixelCount(page) {
  return await page.evaluate(() => {
    if (typeof window.__snowflakePaperArea === "number") {
      return window.__snowflakePaperArea;
    }
    if (typeof window.__snowflakePaperPixels === "number") {
      return window.__snowflakePaperPixels;
    }
    return Number(document.getElementById("foldedCanvas")?.dataset.paperPixels || "0");
  });
}

async function zoomScale(page, selector) {
  const value = await page.locator(selector).getAttribute("data-zoom-scale");
  return Number(value);
}

async function zoomOffsets(page, selector) {
  const locator = page.locator(selector);
  return {
    x: Number((await locator.getAttribute("data-zoom-offset-x")) || "0"),
    y: Number((await locator.getAttribute("data-zoom-offset-y")) || "0")
  };
}

async function wheelZoom(page, selector, deltaY) {
  const target = page.locator(selector);
  await target.hover();
  await page.mouse.wheel(0, deltaY);
}

async function middleDrag(page, selector, from, to) {
  const canvas = page.locator(selector);
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas not found");

  const intrinsic = await panelSize(canvas);
  const toPage = (p) => ({
    x: box.x + (p.x / intrinsic.width) * box.width,
    y: box.y + (p.y / intrinsic.height) * box.height
  });

  const start = toPage(from);
  const end = toPage(to);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(end.x, end.y, { steps: 10 });
  await page.mouse.up({ button: "middle" });
}

async function drawWorldPath(page, selector, points) {
  const canvas = page.locator(selector);
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas not found");

  const intrinsic = await panelSize(canvas);
  const view = await canvas.evaluate((el) => ({
    scale: Number(el.dataset.zoomScale || "1"),
    offsetX: Number(el.dataset.zoomOffsetX || "0"),
    offsetY: Number(el.dataset.zoomOffsetY || "0")
  }));

  const toPage = (p) => {
    const foldedRotation = selector === "#foldedCanvas" ? Math.PI / 6 : 0;
    const rotated = foldedRotation ? rotatePoint(p, foldedRotation) : p;
    return {
      x: box.x + ((rotated.x * view.scale + view.offsetX) / intrinsic.width) * box.width,
      y: box.y + ((rotated.y * view.scale + view.offsetY) / intrinsic.height) * box.height
    };
  };

  const start = toPage(points[0]);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();

  for (let i = 1; i < points.length; i += 1) {
    const next = toPage(points[i]);
    await page.mouse.move(next.x, next.y);
  }

  await page.mouse.up();
  return (await page.locator("#status").textContent()) || "";
}

async function unfoldedRenderedScale(page) {
  const transform = await page.locator('#unfoldedCanvas [data-role="spin-layer"]').getAttribute("transform");
  const m = /scale\(([-+]?\d*\.?\d+)\)/.exec(transform || "");
  if (!m) throw new Error("Unfolded spin transform missing scale()");
  return Number(m[1]);
}

test.describe("snowflake cut validity", () => {
  test("outside edge A to outside edge B is valid", async ({ page }) => {
    await reset(page);

    const status = await drawPath(page, [
      { x: 238, y: 100 },
      { x: 250, y: 145 },
      { x: 283, y: 205 },
      { x: 318, y: 250 },
      { x: 360, y: 255 }
    ]);

    expect(statusIsAccepted(status)).toBe(true);
  });

  test("random cut button applies a valid cut", async ({ page }) => {
    await reset(page);

    const before = await whitePixelCount(page);
    await page.locator("#randomCutBtn").click();
    const status = (await page.locator("#status").textContent()) || "";
    const after = await whitePixelCount(page);

    expect(statusIsAccepted(status)).toBe(true);
    expect(after).toBeLessThan(before);
  });

  test("random cut uses the selected straight tool", async ({ page }) => {
    await reset(page);
    await selectTool(page, "Straight tool");

    const before = await whitePixelCount(page);
    await page.locator("#randomCutBtn").click();
    const status = (await page.locator("#status").textContent()) || "";
    const after = await whitePixelCount(page);

    expect(statusIsAccepted(status)).toBe(true);
    expect(after).toBeLessThan(before);
  });

  test("random straight cuts continue to use remaining paper", async ({ page }) => {
    await reset(page);
    await selectTool(page, "Straight tool");

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const before = await whitePixelCount(page);
      await page.locator("#randomCutBtn").click();
      const status = (await page.locator("#status").textContent()) || "";
      const after = await whitePixelCount(page);

      expect(statusIsAccepted(status)).toBe(true);
      expect(after).toBeLessThan(before);
    }
  });

  test("random cut uses the selected circle tool", async ({ page }) => {
    await reset(page);
    await selectTool(page, "Circle tool");

    const before = await whitePixelCount(page);
    await page.locator("#randomCutBtn").click();
    const status = (await page.locator("#status").textContent()) || "";
    const after = await whitePixelCount(page);

    expect(status).toMatch(/^Circle cut applied/);
    expect(after).toBeLessThan(before);
    expect((before - after) / before).toBeLessThanOrEqual(0.25);
  });

  test("random cut removes no more than 25%", async ({ page }) => {
    await reset(page);

    const before = await whitePixelCount(page);
    await page.locator("#randomCutBtn").click();
    const status = (await page.locator("#status").textContent()) || "";
    const after = await whitePixelCount(page);

    expect(statusIsAccepted(status)).toBe(true);
    const removalFraction = (before - after) / before;
    expect(removalFraction).toBeLessThanOrEqual(0.25);
  });

  test("unfolded auto-fit scale stays stable after cuts", async ({ page }) => {
    await reset(page);

    const beforeScale = await unfoldedRenderedScale(page);
    const status = await drawPath(page, [
      { x: 238, y: 100 },
      { x: 250, y: 145 },
      { x: 283, y: 205 },
      { x: 318, y: 250 },
      { x: 360, y: 255 }
    ]);
    expect(statusIsAccepted(status)).toBe(true);

    const afterScale = await unfoldedRenderedScale(page);
    expect(afterScale).toBeCloseTo(beforeScale, 6);
  });

  test("export svg button triggers download flow", async ({ page }) => {
    await reset(page);

    await page.locator("#exportSvgBtn").click();
    await expect(page.locator("#status")).toHaveText("SVG downloaded.");
  });

  test("holding shift constrains cut to a straight line", async ({ page }) => {
    await reset(page);

    const status = await drawShiftLine(
      page,
      { x: 238, y: 100 },
      { x: 360, y: 255 }
    );

    expect(statusIsAccepted(status)).toBe(true);
  });

  test("shift line endpoint follows cursor until mouseup", async ({ page }) => {
    await reset(page);

    const status = await drawShiftLineWithWaypoints(
      page,
      { x: 238, y: 100 },
      [
        { x: 360, y: 255 },
        { x: 284, y: 208 }
      ]
    );

    expect(statusIsRejected(status)).toBe(true);
  });

  test("default stroke applies prettify before subtraction", async ({ page }) => {
    await reset(page);

    const status = await drawPath(page, [
      { x: 238, y: 100 },
      { x: 250, y: 145 },
      { x: 283, y: 205 },
      { x: 318, y: 250 },
      { x: 360, y: 255 }
    ]);

    expect(status).toContain("prettified");
    expect(statusIsAccepted(status)).toBe(true);
  });

  test("holding alt does not change prettify behavior", async ({ page }) => {
    await reset(page);

    const status = await drawPathWithAltHeldOnRelease(page, [
      { x: 238, y: 100 },
      { x: 250, y: 145 },
      { x: 283, y: 205 },
      { x: 318, y: 250 },
      { x: 360, y: 255 }
    ]);

    expect(status).toContain("prettified");
    expect(statusIsAccepted(status)).toBe(true);
  });

  test("short precise edge-to-edge cut is valid", async ({ page }) => {
    await reset(page);

    const status = await drawPath(page, [
      { x: 140, y: 185 },
      { x: 178, y: 198 },
      { x: 225, y: 214 },
      { x: 286, y: 234 },
      { x: 340, y: 252 }
    ]);

    expect(statusIsAccepted(status)).toBe(true);
  });

  test("long outside traversal across paper is valid", async ({ page }) => {
    await reset(page);

    const status = await drawPath(page, [
      { x: 185, y: 90 },
      { x: 210, y: 130 },
      { x: 240, y: 180 },
      { x: 270, y: 230 },
      { x: 300, y: 275 },
      { x: 330, y: 320 },
      { x: 355, y: 360 }
    ]);

    expect(statusIsAccepted(status)).toBe(true);
  });

  test("outside edge A, wide turn, back to outside edge A is valid", async ({ page }) => {
    await reset(page);

    const status = await drawPath(page, [
      { x: 220, y: 98 },
      { x: 240, y: 150 },
      { x: 285, y: 260 },
      { x: 320, y: 185 },
      { x: 300, y: 98 }
    ]);

    expect(statusIsAccepted(status)).toBe(true);
  });

  test("interior loop-like cut is invalid", async ({ page }) => {
    await reset(page);

    const status = await drawPath(page, [
      { x: 228, y: 210 },
      { x: 250, y: 230 },
      { x: 230, y: 260 },
      { x: 205, y: 240 },
      { x: 228, y: 210 }
    ]);
    expect(statusIsRejected(status)).toBe(true);
  });

  test("outside to inside is invalid", async ({ page }) => {
    await reset(page);

    const status = await drawPath(page, [
      { x: 145, y: 230 },
      { x: 190, y: 225 },
      { x: 228, y: 255 }
    ]);

    expect(statusIsRejected(status)).toBe(true);
  });

  test("undo and redo restore prior paper states", async ({ page }) => {
    await reset(page);

    const firstCut = await drawPath(page, [
      { x: 238, y: 100 },
      { x: 250, y: 145 },
      { x: 283, y: 205 },
      { x: 318, y: 250 },
      { x: 360, y: 255 }
    ]);
    expect(statusIsAccepted(firstCut)).toBe(true);

    const secondCut = await drawPath(page, [
      { x: 220, y: 98 },
      { x: 240, y: 150 },
      { x: 285, y: 260 },
      { x: 320, y: 185 },
      { x: 300, y: 98 }
    ]);
    expect(statusIsAccepted(secondCut)).toBe(true);

    await page.locator("#undoBtn").click();
    await expect(page.locator("#status")).toHaveText("Undid last cut.");
    await expect(page.locator("#redoBtn")).toBeVisible();

    await page.locator("#redoBtn").click();
    await expect(page.locator("#status")).toHaveText("Redid last cut.");
  });

  test("keyboard shortcuts undo and redo cuts", async ({ page }) => {
    await reset(page);

    const firstCut = await drawPath(page, [
      { x: 238, y: 100 },
      { x: 250, y: 145 },
      { x: 283, y: 205 },
      { x: 318, y: 250 },
      { x: 360, y: 255 }
    ]);
    expect(statusIsAccepted(firstCut)).toBe(true);

    await page.keyboard.press("Control+z");
    await expect(page.locator("#status")).toHaveText("Undid last cut.");
    await expect(page.locator("#redoBtn")).toBeVisible();

    await page.keyboard.press("Control+y");
    await expect(page.locator("#status")).toHaveText("Redid last cut.");
  });

  test("clicking the unfolded snowflake toggles spin pause", async ({ page }) => {
    await reset(page);

    const unfolded = page.locator("#unfoldedCanvas");
    await unfolded.click();
    await expect(unfolded).toHaveAttribute("data-spin-paused", "true");

    await unfolded.click();
    await expect(unfolded).toHaveAttribute("data-spin-paused", "false");
  });

  test("wheel zoom works independently on folded and unfolded views", async ({ page }) => {
    await reset(page);

    await expect(page.locator('[data-zoom-badge-for="foldedCanvas"]')).toHaveText("Zoom: 100%");
    await expect(page.locator('[data-zoom-badge-for="unfoldedCanvas"]')).toHaveText("Zoom: 100%");

    const foldedStart = await zoomScale(page, "#foldedCanvas");
    const unfoldedStart = await zoomScale(page, "#unfoldedCanvas");
    expect(foldedStart).toBe(1);
    expect(unfoldedStart).toBe(1);

    await wheelZoom(page, "#foldedCanvas", -800);
    const foldedZoomed = await zoomScale(page, "#foldedCanvas");
    const unfoldedStillStart = await zoomScale(page, "#unfoldedCanvas");
    expect(foldedZoomed).toBeGreaterThan(1);
    expect(unfoldedStillStart).toBe(1);
    await expect(page.locator('[data-zoom-badge-for="foldedCanvas"]')).toHaveText(/^Zoom: \d+%$/);

    await wheelZoom(page, "#foldedCanvas", -20000);
    const foldedMaxed = await zoomScale(page, "#foldedCanvas");
    expect(foldedMaxed).toBe(10);

    const zoomedStatus = await drawWorldPath(page, "#foldedCanvas", [
      { x: 140, y: 185 },
      { x: 178, y: 198 },
      { x: 225, y: 214 },
      { x: 286, y: 234 },
      { x: 340, y: 252 }
    ]);
    expect(statusIsAccepted(zoomedStatus)).toBe(false);

    await wheelZoom(page, "#foldedCanvas", 12000);
    const foldedClamped = await zoomScale(page, "#foldedCanvas");
    expect(foldedClamped).toBe(0.1);
    expect(await zoomOffsets(page, "#foldedCanvas")).toEqual({ x: 234, y: 234 });
    await expect(page.locator('[data-zoom-badge-for="foldedCanvas"]')).toHaveText("Zoom: 10%");

    await wheelZoom(page, "#unfoldedCanvas", -800);
    const unfoldedZoomed = await zoomScale(page, "#unfoldedCanvas");
    const foldedStillClamped = await zoomScale(page, "#foldedCanvas");
    expect(unfoldedZoomed).toBeGreaterThan(1);
    expect(foldedStillClamped).toBe(0.1);
    await expect(page.locator('[data-zoom-badge-for="unfoldedCanvas"]')).toHaveText(/^Zoom: \d+%$/);

    await wheelZoom(page, "#unfoldedCanvas", 12000);
    const unfoldedClamped = await zoomScale(page, "#unfoldedCanvas");
    expect(unfoldedClamped).toBe(0.1);
    expect(await zoomOffsets(page, "#unfoldedCanvas")).toEqual({ x: 234, y: 234 });
    await expect(page.locator('[data-zoom-badge-for="unfoldedCanvas"]')).toHaveText("Zoom: 10%");
  });

  test("middle drag pans zoomed views but stays within bounds", async ({ page }) => {
    await reset(page);

    await wheelZoom(page, "#foldedCanvas", -800);
    const zoomedScale = await zoomScale(page, "#foldedCanvas");
    expect(zoomedScale).toBeGreaterThan(1);

    const minOffsetX = 520 * (1 - zoomedScale);
    const minOffsetY = 520 * (1 - zoomedScale);

    await middleDrag(page, "#foldedCanvas", { x: 260, y: 260 }, { x: 480, y: 480 });
    const afterPan1 = await zoomOffsets(page, "#foldedCanvas");
    expect(afterPan1.x).toBeLessThanOrEqual(0);
    expect(afterPan1.y).toBeLessThanOrEqual(0);
    expect(afterPan1.x).toBeGreaterThanOrEqual(minOffsetX);
    expect(afterPan1.y).toBeGreaterThanOrEqual(minOffsetY);

    await middleDrag(page, "#foldedCanvas", { x: 260, y: 260 }, { x: 40, y: 40 });
    const afterPan2 = await zoomOffsets(page, "#foldedCanvas");
    expect(afterPan2.x).toBeLessThanOrEqual(0);
    expect(afterPan2.y).toBeLessThanOrEqual(0);
    expect(afterPan2.x).toBeGreaterThanOrEqual(minOffsetX);
    expect(afterPan2.y).toBeGreaterThanOrEqual(minOffsetY);
  });

  test("toolbar tool buttons update active state", async ({ page }) => {
    await reset(page);

    await expect(toolButton(page, "Freehand tool")).toHaveAttribute("aria-pressed", "true");
    await expect(toolButton(page, "Straight tool")).toHaveAttribute("aria-pressed", "false");
    await expect(toolButton(page, "Circle tool")).toHaveAttribute("aria-pressed", "false");

    await selectTool(page, "Straight tool");
    await expect(toolButton(page, "Freehand tool")).toHaveAttribute("aria-pressed", "false");
    await expect(toolButton(page, "Straight tool")).toHaveAttribute("aria-pressed", "true");

    await selectTool(page, "Circle tool");
    await expect(toolButton(page, "Straight tool")).toHaveAttribute("aria-pressed", "false");
    await expect(toolButton(page, "Circle tool")).toHaveAttribute("aria-pressed", "true");

    await selectTool(page, "Freehand tool");
    await expect(toolButton(page, "Freehand tool")).toHaveAttribute("aria-pressed", "true");
    await expect(toolButton(page, "Circle tool")).toHaveAttribute("aria-pressed", "false");
  });

  test("straight tool constrains cut without holding shift", async ({ page }) => {
    await reset(page);
    await selectTool(page, "Straight tool");

    const status = await drawPath(page, [
      { x: 238, y: 100 },
      { x: 360, y: 255 },
      { x: 284, y: 208 }
    ]);

    expect(statusIsRejected(status)).toBe(true);
  });

  test("circle tool applies a cut without holding ctrl", async ({ page }) => {
    await reset(page);
    await selectTool(page, "Circle tool");

    await clickFoldedPoint(page, { x: 260, y: 120 });
    const status = (await page.locator("#status").textContent()) || "";

    expect(status).toContain("Circle cut applied");
  });

  test("circle tool stamps a fully enclosed circular hole", async ({ page }) => {
    await reset(page);
    await selectTool(page, "Circle tool");

    await clickFoldedPoint(page, { x: 230, y: 220 });
    await expect(page.locator("#status")).toContainText("Circle cut applied");

    const pathData = await page.locator('#foldedCanvas [data-role="paper-shape"]').getAttribute("d");
    expect((pathData || "").match(/M /g)?.length).toBeGreaterThanOrEqual(2);
  });

  test("random cut does not retain pointer focus", async ({ page }) => {
    await reset(page);
    await selectTool(page, "Circle tool");

    await page.locator("#randomCutBtn").click();

    await expect(toolButton(page, "Circle tool")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#randomCutBtn")).not.toBeFocused();
  });

  test("touch pinch resizes the circle preview", async ({ page }) => {
    await reset(page);
    await selectTool(page, "Circle tool");

    await page.locator("#foldedCanvas").evaluate((canvas) => {
      canvas.setPointerCapture = () => {};
      canvas.releasePointerCapture = () => {};
      const rect = canvas.getBoundingClientRect();
      const dispatchTouch = (type, pointerId, x, y) => {
        canvas.dispatchEvent(new PointerEvent(type, {
          bubbles: true,
          pointerId,
          pointerType: "touch",
          clientX: rect.left + x,
          clientY: rect.top + y
        }));
      };

      dispatchTouch("pointerdown", 1, rect.width * 0.45, rect.height * 0.5);
      dispatchTouch("pointerdown", 2, rect.width * 0.55, rect.height * 0.5);
      dispatchTouch("pointermove", 2, rect.width * 0.65, rect.height * 0.5);
    });

    await expect(page.locator("#status")).toContainText("radius (68 px)");
  });
});

import { expect, test } from "@playwright/test";

const appUrl = "/index.html";

// The outer (top) edge of the folded wedge and the apex, in paper coordinates.
const TOP_EDGE_Y = 125;
const APEX_Y = 430;

// Cuts are drawn in paper coordinates (the folded view is rotated for display).
// Sweeps across the whole top edge, from the vertical fold line to the hypotenuse.
const TOP_TRIM_CUT = [
  { x: 140, y: 230 },
  { x: 200, y: 205 },
  { x: 260, y: 200 },
  { x: 320, y: 215 }
];

// Clips only the corner where the top edge meets the hypotenuse.
const CORNER_CLIP_CUT = [
  { x: 238, y: 100 },
  { x: 250, y: 145 },
  { x: 283, y: 205 },
  { x: 318, y: 250 },
  { x: 360, y: 255 }
];

// Removes what is left of the top edge after CORNER_CLIP_CUT.
const SECOND_TRIM_CUT = [
  { x: 140, y: 185 },
  { x: 190, y: 170 },
  { x: 240, y: 165 },
  { x: 280, y: 185 },
  { x: 312, y: 232 }
];

const EXPANDED_STATUS = "Expanded to fill the paper.";

async function reset(page) {
  await page.goto(appUrl);
  await page.locator("#resetBtn").click();
}

async function setExpandToFill(page, enabled) {
  await page.locator("#optionsBtn").click();
  await page.locator("#optionsExpandToFillInput").setChecked(enabled);
  await page.locator("#optionsSaveBtn").click();
}

async function panelSize(locator) {
  return await locator.evaluate((el) => ({
    width: Number(el.getAttribute("width")) || 520,
    height: Number(el.getAttribute("height")) || 520
  }));
}

function rotatePoint(point, angle, center = { x: 260, y: 260 }) {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: center.y + dx * Math.sin(angle) + dy * Math.cos(angle)
  };
}

async function foldedPointToPage(page, point) {
  const canvas = page.locator("#foldedCanvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Folded canvas not found");
  const intrinsic = await panelSize(canvas);
  const rotation = Number(await canvas.getAttribute("data-folded-rotation"));
  const rotated = rotatePoint(point, rotation);
  return {
    x: box.x + (rotated.x / intrinsic.width) * box.width,
    y: box.y + (rotated.y / intrinsic.height) * box.height
  };
}

async function drawPath(page, points) {
  const start = await foldedPointToPage(page, points[0]);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const point of points.slice(1)) {
    const next = await foldedPointToPage(page, point);
    await page.mouse.move(next.x, next.y);
  }
  await page.mouse.up();
  return (await page.locator("#status").textContent()) || "";
}

async function clickFoldedPoint(page, point) {
  const target = await foldedPointToPage(page, point);
  await page.mouse.click(target.x, target.y);
}

async function selectTool(page, label) {
  await page.getByRole("button", { name: label, exact: true }).click();
}

async function paperMetrics(page) {
  return await page.evaluate(() => {
    const path = document.querySelector('#foldedCanvas [data-role="paper-shape"]');
    const box = path.getBBox();
    return {
      minX: box.x,
      minY: box.y,
      maxX: box.x + box.width,
      maxY: box.y + box.height,
      area: window.__snowflakePaperArea
    };
  });
}

function paperPath(page) {
  return page.locator('#foldedCanvas [data-role="paper-shape"]').getAttribute("d");
}

// Size of the unfolded snowflake in geometry units, whatever the panel's zoom.
async function unfoldedSize(page) {
  return await page.locator('#unfoldedCanvas [data-role="snowflake-shape"]').evaluate((path) => {
    const box = path.getBBox();
    return Math.max(box.width, box.height);
  });
}

test("Options offers Expand to fill paper and turns it on by default", async ({ page }) => {
  await page.goto(appUrl);
  await page.locator("#optionsBtn").click();

  const checkbox = page.getByRole("checkbox", { name: "Expand to fill paper" });
  await expect(checkbox).toBeChecked();
  await expect(checkbox).toHaveAttribute("aria-describedby", "optionsExpandToFillNote");
  await expect(page.locator("#optionsExpandToFillNote")).toContainText("fill the paper");
});

test("trimming the whole top edge expands the design to fill the paper", async ({ page }) => {
  await reset(page);
  const before = await paperMetrics(page);
  const unfoldedBefore = await unfoldedSize(page);
  expect(before.minY).toBeCloseTo(TOP_EDGE_Y, 1);

  const status = await drawPath(page, TOP_TRIM_CUT);
  expect(status).toMatch(/^Accepted \(/);
  expect(status).toContain(EXPANDED_STATUS);

  // The highest point is back on the outer edge and nothing moved off the fold lines.
  const after = await paperMetrics(page);
  expect(after.minY).toBeCloseTo(TOP_EDGE_Y, 1);
  expect(after.maxY).toBeCloseTo(APEX_Y, 1);
  expect(after.minX).toBeCloseTo(before.minX, 1);
  expect(after.area).toBeGreaterThan(before.area * 0.9);
  expect(after.area).toBeLessThan(before.area);

  await expect.poll(() => unfoldedSize(page)).toBeGreaterThan(unfoldedBefore * 0.85);
});

test("without the option the trimmed design stays small", async ({ page }) => {
  await reset(page);
  await setExpandToFill(page, false);
  const before = await paperMetrics(page);
  const unfoldedBefore = await unfoldedSize(page);

  const status = await drawPath(page, TOP_TRIM_CUT);
  expect(status).toMatch(/^Accepted \(/);
  expect(status).not.toContain(EXPANDED_STATUS);

  const after = await paperMetrics(page);
  expect(after.minY).toBeGreaterThan(TOP_EDGE_Y + 50);
  expect(after.area).toBeLessThan(before.area * 0.7);
  await expect.poll(() => unfoldedSize(page)).toBeLessThan(unfoldedBefore * 0.75);
});

test("a cut that leaves part of the top edge does not expand", async ({ page }) => {
  await reset(page);
  const before = await paperMetrics(page);

  const status = await drawPath(page, CORNER_CLIP_CUT);
  expect(status).toMatch(/^Accepted \(/);
  expect(status).not.toContain(EXPANDED_STATUS);

  const after = await paperMetrics(page);
  expect(after.minY).toBeCloseTo(TOP_EDGE_Y, 1);
  expect(after.area).toBeLessThan(before.area);
});

test("several cuts that together trim the top edge expand after the last one", async ({ page }) => {
  await reset(page);

  const first = await drawPath(page, CORNER_CLIP_CUT);
  expect(first).not.toContain(EXPANDED_STATUS);
  const afterFirst = await paperMetrics(page);
  expect(afterFirst.minY).toBeCloseTo(TOP_EDGE_Y, 1);

  const second = await drawPath(page, SECOND_TRIM_CUT);
  expect(second).toMatch(/^Accepted \(/);
  expect(second).toContain(EXPANDED_STATUS);
  const afterSecond = await paperMetrics(page);
  expect(afterSecond.minY).toBeCloseTo(TOP_EDGE_Y, 1);
  expect(afterSecond.maxY).toBeCloseTo(APEX_Y, 1);
});

test("a straight cut across the top edge expands too", async ({ page }) => {
  await reset(page);
  await selectTool(page, "Straight tool");

  const status = await drawPath(page, [{ x: 140, y: 215 }, { x: 330, y: 195 }]);
  expect(status).toMatch(/^Accepted \(/);
  expect(status).toContain(EXPANDED_STATUS);
  expect((await paperMetrics(page)).minY).toBeCloseTo(TOP_EDGE_Y, 1);
});

test("circle cuts expand once they have cleared the whole top edge", async ({ page }) => {
  await reset(page);
  await selectTool(page, "Circle tool");

  // Each circle (radius 34) overlaps the next, so only the last one clears the top edge.
  const centers = [190, 245, 300, 355].map((x) => ({ x, y: TOP_EDGE_Y }));
  for (const center of centers.slice(0, -1)) {
    await clickFoldedPoint(page, center);
    await expect(page.locator("#status")).toContainText("Circle cut applied");
    await expect(page.locator("#status")).not.toContainText(EXPANDED_STATUS);
    expect((await paperMetrics(page)).minY).toBeCloseTo(TOP_EDGE_Y, 1);
  }

  const before = await paperMetrics(page);
  await clickFoldedPoint(page, centers[centers.length - 1]);
  await expect(page.locator("#status")).toContainText(EXPANDED_STATUS);
  const after = await paperMetrics(page);
  expect(after.minY).toBeCloseTo(TOP_EDGE_Y, 1);
  expect(after.maxY).toBeCloseTo(APEX_Y, 1);
  expect(after.area).toBeGreaterThan(before.area * 0.95);
});

test("expansion follows the selected number of sides", async ({ page }) => {
  await reset(page);
  await page.locator("#optionsBtn").click();
  await page.locator("#optionsSideCountInput").fill("8");
  await page.locator("#optionsSaveBtn").click();

  const status = await drawPath(page, TOP_TRIM_CUT);
  expect(status).toMatch(/^Accepted \(/);
  expect(status).toContain(EXPANDED_STATUS);
  const after = await paperMetrics(page);
  expect(after.minY).toBeCloseTo(TOP_EDGE_Y, 1);
  expect(after.maxY).toBeCloseTo(APEX_Y, 1);
});

test("turning the option off or on only affects later cuts", async ({ page }) => {
  await reset(page);
  await setExpandToFill(page, false);
  await drawPath(page, TOP_TRIM_CUT);
  const trimmed = await paperPath(page);
  expect((await paperMetrics(page)).minY).toBeGreaterThan(TOP_EDGE_Y + 50);

  // Turning it back on leaves the design alone...
  await setExpandToFill(page, true);
  expect(await paperPath(page)).toBe(trimmed);

  // ...and the next cut grows it.
  const status = await drawPath(page, [
    { x: 150, y: 330 },
    { x: 230, y: 300 },
    { x: 330, y: 330 }
  ]);
  expect(status).toMatch(/^Accepted \(/);
  expect(status).toContain(EXPANDED_STATUS);
  expect((await paperMetrics(page)).minY).toBeCloseTo(TOP_EDGE_Y, 1);
});

test("Undo and Redo treat the expansion as part of its cut", async ({ page }) => {
  await reset(page);
  const original = await paperPath(page);

  await drawPath(page, TOP_TRIM_CUT);
  const expanded = await paperPath(page);
  expect(expanded).not.toBe(original);

  await page.locator("#undoBtn").click();
  await expect(page.locator("#status")).toHaveText("Undid last cut.");
  expect(await paperPath(page)).toBe(original);
  await expect(page.locator("#undoBtn")).toBeDisabled();

  await page.locator("#redoBtn").click();
  await expect(page.locator("#status")).toHaveText("Redid last cut.");
  expect(await paperPath(page)).toBe(expanded);
  expect((await paperMetrics(page)).minY).toBeCloseTo(TOP_EDGE_Y, 1);
});

test("the setting is remembered and Restore defaults turns it back on", async ({ page }) => {
  await reset(page);
  await setExpandToFill(page, false);

  await page.reload();
  await expect(page.locator("#status")).toHaveText("Restored previous snowflake.");
  await page.locator("#optionsBtn").click();
  const checkbox = page.locator("#optionsExpandToFillInput");
  await expect(checkbox).not.toBeChecked();

  await page.locator("#optionsRestoreDefaultsBtn").click();
  await expect(checkbox).toBeChecked();
  await page.locator("#optionsSaveBtn").click();

  const status = await drawPath(page, TOP_TRIM_CUT);
  expect(status).toContain(EXPANDED_STATUS);
});

test("designs saved before the option existed load with it on and still count as saved", async ({ page }) => {
  await reset(page);
  await drawPath(page, CORNER_CLIP_CUT);
  const saveButton = page.locator("#saveToCollectionBtn");
  await saveButton.click();
  await expect(saveButton).toBeDisabled();

  // Rewrite the stored design the way the previous version stored it.
  await page.evaluate(() => {
    const key = "snowflakeStudio.active.v1";
    const stored = JSON.parse(localStorage.getItem(key));
    const { expandToFill, ...legacyOptions } = stored.options;
    stored.options = legacyOptions;
    stored.lastCollectionSavedSignature = JSON.stringify({
      paperGeom: stored.paperGeom,
      options: legacyOptions
    });
    localStorage.setItem(key, JSON.stringify(stored));
  });

  await page.reload();
  await expect(page.locator("#status")).toHaveText("Restored previous snowflake.");
  await expect(saveButton).toBeDisabled();
  await page.locator("#optionsBtn").click();
  await expect(page.locator("#optionsExpandToFillInput")).toBeChecked();
  await page.locator("#optionsCancelBtn").click();

  // The upgraded signature still recognises the saved design after an Undo.
  await drawPath(page, SECOND_TRIM_CUT);
  await expect(saveButton).toBeEnabled();
  await page.locator("#undoBtn").click();
  await expect(saveButton).toBeDisabled();
});

test.describe("expandGeomToFill", () => {
  test("scales the design about the apex until its highest point reaches the outer edge", async ({ page }) => {
    await page.goto(appUrl);

    const result = await page.evaluate(async (cut) => {
      const { createBasePaperGeomForSideCount, getOuterBaseForSideCount } = await import("/src/geometry/paper.ts");
      const { computeCutOutcome, prettifyCutPath } = await import("/src/geometry/cuts.ts");
      const { geomArea, getGeomBounds } = await import("/src/geometry/polygon.ts");
      const { expandGeomToFill } = await import("/src/geometry/expand.ts");

      const trimmed = computeCutOutcome(
        createBasePaperGeomForSideCount(6), prettifyCutPath(cut), "edge", getOuterBaseForSideCount(6)
      ).finalGeom;
      const expanded = expandGeomToFill(trimmed, 6);

      // The same design scaled exactly, as the reference for "proportions kept".
      const apex = { x: 172, y: 430 };
      const reference = trimmed.map((polygon) => polygon.map((ring) =>
        ring.map(([x, y]) => [apex.x + (x - apex.x) * expanded.scale, apex.y + (y - apex.y) * expanded.scale])
      ));
      const bounds = getGeomBounds(expanded.geom);
      const referenceBounds = getGeomBounds(reference);
      return {
        scale: expanded.scale,
        trimmedReach: apex.y - getGeomBounds(trimmed).minY,
        boundsError: Math.max(
          Math.abs(bounds.minX - referenceBounds.minX),
          Math.abs(bounds.maxX - referenceBounds.maxX),
          Math.abs(bounds.minY - referenceBounds.minY),
          Math.abs(bounds.maxY - referenceBounds.maxY)
        ),
        areaError: Math.abs(geomArea(expanded.geom) - geomArea(reference)) / geomArea(reference)
      };
    }, TOP_TRIM_CUT);

    // The paper is 305 tall, so the highest point has to end up 305 above the apex.
    expect(result.scale).toBeGreaterThan(1);
    expect(result.scale * result.trimmedReach).toBeCloseTo(APEX_Y - TOP_EDGE_Y, 6);
    expect(result.boundsError).toBeLessThan(0.05);
    expect(result.areaError).toBeLessThan(0.001);
  });

  test("keeps the unfolded snowflake intact across random cut sequences", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto(appUrl);

    const { problems, expansions } = await page.evaluate(async () => {
      const { createBasePaperGeomForSideCount, getOuterBaseForSideCount } = await import("/src/geometry/paper.ts");
      const { computeCutOutcome } = await import("/src/geometry/cuts.ts");
      const { buildUnfoldedGeom } = await import("/src/geometry/unfold.ts");
      const { geomArea, getGeomBounds } = await import("/src/geometry/polygon.ts");
      const { expandGeomToFill, getExpandToFillScale } = await import("/src/geometry/expand.ts");

      // Fixed seed, so every run replays the same cuts.
      let seed = 12345;
      const random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };

      const apex = { x: 172, y: 430 };
      const foldBase = { x: 172, y: 125 };
      const pointOnPerimeter = (outerBase, t) => {
        const edges = [[apex, foldBase], [foldBase, outerBase], [outerBase, apex]];
        const lengths = edges.map(([a, b]) => Math.hypot(b.x - a.x, b.y - a.y));
        let distance = t * lengths.reduce((sum, length) => sum + length, 0);
        for (let i = 0; i < 3; i += 1) {
          if (distance <= lengths[i] || i === 2) {
            const [a, b] = edges[i];
            const u = Math.min(1, distance / lengths[i]);
            return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, edge: i };
          }
          distance -= lengths[i];
        }
        return null;
      };
      const extend = (a, b, by) => {
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        const ux = (b.x - a.x) / length;
        const uy = (b.y - a.y) / length;
        return [{ x: a.x - ux * by, y: a.y - uy * by }, { x: b.x + ux * by, y: b.y + uy * by }];
      };
      const unfold = (geom, sideCount) => {
        const unfolded = buildUnfoldedGeom(geom, sideCount, [], (error) => { throw error; });
        return { unfolded, polygons: unfolded.length, holes: unfolded.flatMap((polygon) => polygon.slice(1)).length };
      };
      const areaError = (unfolded, geom, sideCount) => {
        const expected = geomArea(geom) * sideCount * 2;
        return Math.abs(geomArea(unfolded) - expected) / expected;
      };

      const problems = [];
      let expansions = 0;
      for (let sideCount = 4; sideCount <= 10; sideCount += 1) {
        const outerBase = getOuterBaseForSideCount(sideCount);
        for (let run = 0; run < 12; run += 1) {
          let paper = createBasePaperGeomForSideCount(sideCount);
          for (let step = 0; step < 14; step += 1) {
            // Straight and wobbly cuts, so vertices land at all sorts of places along the fold lines.
            const a = pointOnPerimeter(outerBase, random());
            const b = pointOnPerimeter(outerBase, random());
            if (a.edge === b.edge || Math.hypot(a.x - b.x, a.y - b.y) < 20) continue;
            const curved = random() < 0.5;
            let path;
            if (curved) {
              const [start, end] = extend(a, b, 6);
              const mx = (a.x + b.x) / 2 + (random() - 0.5) * 120;
              const my = (a.y + b.y) / 2 + (random() - 0.5) * 120;
              path = [
                start,
                { x: (start.x + mx) / 2 + (random() - 0.5) * 20, y: (start.y + my) / 2 },
                { x: mx, y: my },
                { x: (end.x + mx) / 2, y: (end.y + my) / 2 + (random() - 0.5) * 20 },
                end
              ];
            } else {
              path = extend(a, b, 6);
            }

            let outcome = null;
            try {
              outcome = computeCutOutcome(paper, path, "edge", outerBase, { straight: !curved });
            } catch (_) {
              outcome = null;
            }
            if (!outcome || !outcome.finalGeom || outcome.finalGeom.length === 0) continue;

            const trimmed = outcome.finalGeom;
            const expanded = expandGeomToFill(trimmed, sideCount);
            if (expanded.scale === 1) {
              paper = trimmed;
              continue;
            }

            expansions += 1;
            const label = `${sideCount} sides, run ${run}, step ${step}`;
            const before = unfold(trimmed, sideCount);
            const after = unfold(expanded.geom, sideCount);
            if (after.polygons !== before.polygons) problems.push(`${label}: ${before.polygons} -> ${after.polygons} polygons`);
            if (after.holes !== before.holes) problems.push(`${label}: ${before.holes} -> ${after.holes} holes`);
            if (Math.abs(getGeomBounds(expanded.geom).minY - 125) > 0.011) problems.push(`${label}: top edge missed`);
            if (getExpandToFillScale(expanded.geom) !== 1) problems.push(`${label}: not idempotent`);
            const areaRatio = geomArea(expanded.geom) / geomArea(trimmed);
            if (Math.abs(areaRatio / expanded.scale ** 2 - 1) > 2e-3) problems.push(`${label}: area ratio ${areaRatio}`);
            // Grid rounding alone moves this by a few 1e-4, so only a lost or doubled chunk can trip it.
            const errorBefore = areaError(before.unfolded, trimmed, sideCount);
            const errorAfter = areaError(after.unfolded, expanded.geom, sideCount);
            if (errorAfter > 2 * errorBefore + 1e-3) problems.push(`${label}: unfolded area error grew to ${errorAfter}`);
            paper = expanded.geom;
          }
        }
      }
      return { problems, expansions };
    });

    expect(problems).toEqual([]);
    // Guards against the loop quietly stopping exercising anything.
    expect(expansions).toBeGreaterThan(100);
  });

  test("leaves designs that still reach the outer edge alone", async ({ page }) => {
    await page.goto(appUrl);

    const results = await page.evaluate(async () => {
      const { createBasePaperGeomForSideCount, getOuterBaseForSideCount } = await import("/src/geometry/paper.ts");
      const { computeCutOutcome, prettifyCutPath } = await import("/src/geometry/cuts.ts");
      const { expandGeomToFill } = await import("/src/geometry/expand.ts");

      const base = createBasePaperGeomForSideCount(6);
      const clipped = computeCutOutcome(
        base,
        prettifyCutPath([[238, 100], [250, 145], [283, 205], [318, 250], [360, 255]].map(([x, y]) => ({ x, y }))),
        "edge",
        getOuterBaseForSideCount(6)
      ).finalGeom;
      const untouched = expandGeomToFill(base, 6);
      const partial = expandGeomToFill(clipped, 6);
      return {
        untouchedScale: untouched.scale,
        untouchedSame: untouched.geom === base,
        partialScale: partial.scale,
        partialSame: partial.geom === clipped
      };
    });

    expect(results).toEqual({
      untouchedScale: 1,
      untouchedSame: true,
      partialScale: 1,
      partialSame: true
    });
  });
});

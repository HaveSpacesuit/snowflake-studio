import { test, expect } from "@playwright/test";

for (let sideCount = 4; sideCount <= 10; sideCount += 1) {
  for (const edge of ["vertical", "angled"]) {
    test(`${sideCount}-sided snowflake has no ${edge} fold seams after independent arc cuts`, async ({ page }) => {
      await page.goto("/index.html");

      const results = await page.evaluate(async ({ sideCount, edge }) => {
        const { createBasePaperGeomForSideCount, getOuterBaseForSideCount } = await import("/src/geometry/paper.ts");
        const { computeCutOutcome, prettifyCutPath } = await import("/src/geometry/cuts.ts");
        const { buildUnfoldedGeom } = await import("/src/geometry/unfold.ts");
        const { buildUnfoldedOutlinePaths } = await import("/src/geometry/outline.ts");
        const { geomArea } = await import("/src/geometry/polygon.ts");
        const { buildPrintPreviewSvgString } = await import("/src/print/previewSvg.ts");
        const angle = edge === "vertical" ? 0 : Math.PI / sideCount;
        const direction = { x: Math.sin(angle), y: -Math.cos(angle) };
        const inward = edge === "vertical"
          ? { x: 1, y: 0 }
          : { x: -Math.cos(angle), y: -Math.sin(angle) };
        let paper = createBasePaperGeomForSideCount(sideCount);
        const results = [];

        for (let cutCount = 0; cutCount <= 2; cutCount += 1) {
          if (cutCount > 0) {
            const center = cutCount === 1 ? 100 : 180;
            const points = [[-22, -12], [-18, 0], [-10, 12], [0, 16], [10, 12], [18, 0], [22, -12]]
              .map(([along, offset]) => ({
                x: 172 + direction.x * (center + along) + inward.x * offset,
                y: 430 + direction.y * (center + along) + inward.y * offset
              }));
            const outcome = computeCutOutcome(
              paper, prettifyCutPath(points), "edge", getOuterBaseForSideCount(sideCount)
            );
            if (!outcome) throw new Error("Could not apply the regression cut");
            paper = outcome.finalGeom;
          }

          const unfolded = buildUnfoldedGeom(paper, sideCount, [], (error) => { throw error; });
          const outlines = buildUnfoldedOutlinePaths(unfolded);
          const holes = unfolded.flatMap((polygon) => polygon.slice(1));
          const maxHoleSegment = Math.max(0, ...holes.flatMap((ring) =>
            ring.map((point, i) => {
              const next = ring[(i + 1) % ring.length];
              return Math.hypot(next[0] - point[0], next[1] - point[1]);
            })
          ));
          const printSvg = buildPrintPreviewSvgString(unfolded, { sideCount });
          const printPaths = [...printSvg.matchAll(/class="printPreviewOutline" d="([^"]*)"/g)]
            .map((match) => match[1]);
          const expectedArea = geomArea(paper) * sideCount * 2;
          results.push({
            cutCount,
            polygonCount: unfolded.length,
            holeCount: holes.length,
            outerContourCount: (outlines.outerPath.match(/M /g) || []).length,
            holeContourCount: (outlines.holePath.match(/M /g) || []).length,
            maxHoleSegment,
            relativeAreaError: Math.abs(geomArea(unfolded) - expectedArea) / expectedArea,
            printPaths,
            outlines
          });
        }
        return results;
      }, { sideCount, edge });

      for (const result of results) {
        expect(result.polygonCount, `after ${result.cutCount} cuts`).toBe(1);
        expect(result.holeCount).toBe(sideCount * result.cutCount);
        expect(result.outerContourCount).toBe(1);
        expect(result.holeContourCount).toBe(sideCount * result.cutCount);
        expect(result.maxHoleSegment).toBeLessThan(45);
        expect(result.relativeAreaError).toBeLessThan(0.0001);
        expect(result.printPaths).toEqual([result.outlines.outerPath, result.outlines.holePath]);
      }
    });
  }
}

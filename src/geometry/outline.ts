// Builds the stroked outline paths for the unfolded snowflake. The body is one
// path; the outline is split into an outer silhouette and interior hole
// boundaries so each can be stroked with its own colour and width.

import polygonClipping from "polygon-clipping";
import { OUTLINE_GRID } from "../constants.ts";
import { normalizeGeom, pointsToPath } from "./polygon.ts";

export function buildUnfoldedOutlinePaths(geom) {
  if (!geom || geom.length === 0) return { outerPath: "", holePath: "" };

  let outlineGeom = geom;
  try {
    // Snap to a coarse grid and re-union so adjacent mirrored wedges merge into
    // clean silhouettes instead of leaving hairline seams.
    const snapped = normalizeGeom(
      geom.map((polygon) =>
        polygon.map((ring) =>
          ring.map((pt) => [
            Math.round(pt[0] / OUTLINE_GRID) * OUTLINE_GRID,
            Math.round(pt[1] / OUTLINE_GRID) * OUTLINE_GRID
          ])
        )
      )
    );

    if (snapped.length > 0) {
      let merged = snapped[0];
      for (let i = 1; i < snapped.length; i += 1) {
        merged = polygonClipping.union(merged, snapped[i]) as any;
      }
      outlineGeom = normalizeGeom(merged);
    } else {
      outlineGeom = geom;
    }
  } catch (err) {
    console.error("Outline union failed", err);
    outlineGeom = geom;
  }

  let outerPath = "";
  let holePath = "";

  for (const polygon of outlineGeom) {
    if (!polygon || polygon.length === 0) continue;
    const outer = polygon[0];
    if (outer && outer.length >= 3) {
      outerPath += pointsToPath(outer) + " Z ";
    }
    for (let i = 1; i < polygon.length; i += 1) {
      const ring = polygon[i];
      if (!ring || ring.length < 3) continue;
      holePath += pointsToPath(ring) + " Z ";
    }
  }

  return { outerPath: outerPath.trim(), holePath: holePath.trim() };
}

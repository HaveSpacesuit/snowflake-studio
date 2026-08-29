// Cut path processing and validation.
//
// A cut is a free-hand poly-line the user draws across the folded paper. This
// module smooths/prettifies the path, decides whether it is a valid
// edge-to-edge cut, and computes the resulting geometry by subtracting a
// "ribbon" (the stroked path widened into a polygon) from the paper.

import polygonClipping from "polygon-clipping";
import { APEX, CUT_WIDTH, FOLD_BASE, MIN_EDGE_INSIDE_LENGTH } from "../constants.ts";
import { clamp, dist } from "../utils/math.ts";
import {
  cloneGeom,
  distanceToBoundary,
  geomArea,
  normalizeGeom,
  pointInGeom,
  polygonArea
} from "./polygon.ts";

/** Remove near-duplicate points and apply a light 3-tap smoothing pass. */
export function sanitizeCutPath(points) {
  if (points.length < 3) return points.slice();
  const deduped = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    if (dist(points[i], deduped[deduped.length - 1]) >= 1.6) deduped.push(points[i]);
  }
  if (deduped.length < 3) return deduped;
  const smoothed = deduped.slice();
  for (let i = 1; i < smoothed.length - 1; i += 1) {
    smoothed[i] = {
      x: (deduped[i - 1].x + deduped[i].x * 2 + deduped[i + 1].x) / 4,
      y: (deduped[i - 1].y + deduped[i].y * 2 + deduped[i + 1].y) / 4
    };
  }
  return smoothed;
}

/** Chaikin-style corner cutting to give the final cut a smooth, organic look. */
export function prettifyCutPath(points) {
  const base = sanitizeCutPath(points.slice());
  if (base.length < 4) return base;
  let work = base.slice();

  const iterations = work.length < 48 ? 2 : 1;
  for (let iter = 0; iter < iterations; iter += 1) {
    if (work.length < 3) break;
    const next = [];

    next.push(work[0]);

    const max = work.length - 1;
    for (let i = 0; i < max; i += 1) {
      const a = work[i];
      const b = work[i + 1];
      const q = { x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 };
      const r = { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 };
      next.push(q, r);
    }

    next.push(work[work.length - 1]);

    work = next;
    if (work.length > 640) {
      const decimated = [];
      for (let i = 0; i < work.length; i += 2) decimated.push(work[i]);
      work = decimated;
    }
  }

  return sanitizeCutPath(work);
}

export function cutPathLength(points) {
  if (!Array.isArray(points) || points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += dist(points[i - 1], points[i]);
  }
  return total;
}

/**
 * Walk the stroke, counting inside/outside transitions and the length of the
 * portion that lies inside the paper. A valid edge-to-edge cut enters and exits
 * the paper (>= 2 transitions) with a meaningful interior run.
 */
function analyzeStroke(points, geom, step = 4) {
  if (points.length < 2) return { transitions: 0, insideLength: 0 };

  let transitions = 0;
  let insideLength = 0;
  let prev = points[0];
  let prevInside = pointInGeom(prev, geom);

  for (let i = 1; i < points.length; i += 1) {
    const curr = points[i];
    const segLen = dist(prev, curr);
    const steps = Math.max(1, Math.ceil(segLen / step));
    let lastPt = prev;
    let lastInside = prevInside;

    for (let s = 1; s <= steps; s += 1) {
      const t = s / steps;
      const sample = {
        x: prev.x + (curr.x - prev.x) * t,
        y: prev.y + (curr.y - prev.y) * t
      };
      const inside = pointInGeom(sample, geom);
      if (inside !== lastInside) transitions += 1;
      if (inside && lastInside) insideLength += dist(lastPt, sample);
      lastInside = inside;
      lastPt = sample;
    }

    prev = curr;
    prevInside = lastInside;
  }

  return { transitions, insideLength };
}

export function validateCut(points, geom) {
  if (points.length < 2) return { valid: false, reason: "Cut too short." };

  const stroke = analyzeStroke(points, geom, 4);
  const edgeToEdge = stroke.transitions >= 2 && stroke.insideLength >= MIN_EDGE_INSIDE_LENGTH;

  if (edgeToEdge) {
    return { valid: true, reason: "edge-to-edge", mode: "edge" };
  }

  return { valid: false, reason: "Invalid cut: start and end from edges." };
}

export function getLiveCutPreview(points, geom) {
  if (points.length < 2) return { mode: "none", text: "Drawing..." };
  const raw = sanitizeCutPath(points.slice());
  const result = validateCut(raw, geom);
  if (result.valid && result.mode === "edge") return { mode: "edge", text: "Edge-to-edge ready: release to cut." };
  return { mode: "invalid", text: "Need an edge-to-edge cut." };
}

/** Average direction of the first (or last) few segments, normalised. */
function getEndpointDirection(points, fromStart) {
  if (points.length < 2) return { x: 0, y: 0 };
  const steps = Math.min(4, points.length - 1);
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < steps; i += 1) {
    if (fromStart) {
      vx += points[i + 1].x - points[i].x;
      vy += points[i + 1].y - points[i].y;
    } else {
      const n = points.length - 1 - i;
      vx += points[n - 1].x - points[n].x;
      vy += points[n - 1].y - points[n].y;
    }
  }
  const mag = Math.hypot(vx, vy);
  if (mag < 1e-6) return { x: 0, y: 0 };
  return { x: vx / mag, y: vy / mag };
}

/** Widen a poly-line into a closed polygon ring of the given width. */
function polylineToRibbon(points, width) {
  if (points.length < 2) return [];
  const half = width / 2;
  const left = [];
  const right = [];

  function tangent(i) {
    if (i === 0) {
      return { x: points[1].x - points[0].x, y: points[1].y - points[0].y };
    }
    if (i === points.length - 1) {
      return { x: points[i].x - points[i - 1].x, y: points[i].y - points[i - 1].y };
    }
    return {
      x: points[i + 1].x - points[i - 1].x,
      y: points[i + 1].y - points[i - 1].y
    };
  }

  for (let i = 0; i < points.length; i += 1) {
    const t = tangent(i);
    const mag = Math.hypot(t.x, t.y) || 1;
    const nx = -t.y / mag;
    const ny = t.x / mag;
    left.push([points[i].x + nx * half, points[i].y + ny * half]);
    right.push([points[i].x - nx * half, points[i].y - ny * half]);
  }

  return left.concat(right.reverse());
}

/** Fraction of a sampled edge segment that remains covered by `geom`. */
function sampleEdgeRetention(geom, a, b, samples = 16) {
  let kept = 0;
  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const pt = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    if (pointInGeom(pt, geom) || distanceToBoundary(pt, geom) <= 1.0) {
      kept += 1;
    }
  }
  return kept / (samples + 1);
}

/**
 * When an edge cut splits the paper into several pieces, keep the piece that
 * best preserves the two original wedge edges (falling back to largest area).
 */
function chooseEdgeCutResult(parts, outerBase) {
  if (!Array.isArray(parts) || parts.length <= 1) {
    return { geom: parts, index: 0 };
  }

  const candidates = parts.map((polygon, index) => {
    const geom = [cloneGeom(polygon)];
    const leftKeep = sampleEdgeRetention(geom, APEX, FOLD_BASE);
    const rightKeep = sampleEdgeRetention(geom, APEX, outerBase);
    return {
      index,
      area: polygonArea(polygon),
      geom,
      edgeBalance: Math.min(leftKeep, rightKeep),
      edgeSum: leftKeep + rightKeep
    };
  });

  let best = candidates[0];
  for (let i = 1; i < candidates.length; i += 1) {
    const c = candidates[i];
    const betterBalance = c.edgeBalance > best.edgeBalance + 1e-6;
    const sameBalance = Math.abs(c.edgeBalance - best.edgeBalance) <= 1e-6;
    const betterEdgeSum = c.edgeSum > best.edgeSum + 1e-6;
    const sameEdgeSum = Math.abs(c.edgeSum - best.edgeSum) <= 1e-6;
    const betterArea = c.area > best.area;

    if (betterBalance || (sameBalance && (betterEdgeSum || (sameEdgeSum && betterArea)))) {
      best = c;
    }
  }

  return { geom: best.geom, index: best.index };
}

/**
 * Subtract the cut ribbon from `sourceGeom` and return `{ finalGeom,
 * removedGeom }`. `removedGeom` is used to animate the falling scrap.
 */
export function computeCutOutcome(sourceGeom, points, mode, outerBase) {
  const draw = sanitizeCutPath(points);
  if (draw.length < 2) return null;
  const originalGeom = cloneGeom(sourceGeom);

  if (mode === "edge") {
    // Extend both ends slightly so the ribbon fully crosses the boundary.
    const startDir = getEndpointDirection(draw, true);
    const endDir = getEndpointDirection(draw, false);
    const ext = 6;
    draw[0] = { x: draw[0].x - startDir.x * ext, y: draw[0].y - startDir.y * ext };
    const li = draw.length - 1;
    draw[li] = { x: draw[li].x - endDir.x * ext, y: draw[li].y - endDir.y * ext };
  }

  const ribbonRing = polylineToRibbon(draw, CUT_WIDTH);
  if (ribbonRing.length < 3) return null;

  const cutGeom = normalizeGeom([[[...ribbonRing]]]);
  if (cutGeom.length === 0) return null;

  let next;
  try {
    next = normalizeGeom(polygonClipping.difference(sourceGeom, cutGeom));
  } catch (err) {
    console.error("Cut boolean failed", err);
    return null;
  }

  const splitParts = next.map((polygon) => cloneGeom(polygon));
  let chosenIndex = 0;

  if (mode === "edge" && next.length > 1) {
    const chosen = chooseEdgeCutResult(next, outerBase);
    next = chosen.geom;
    chosenIndex = Number.isInteger(chosen.index) ? chosen.index : 0;
  }

  const finalGeom = next.length === 0 ? [] : normalizeGeom(next);

  let removedGeom = [];
  if (mode === "edge" && splitParts.length > 1) {
    const removedParts = [];
    for (let i = 0; i < splitParts.length; i += 1) {
      if (i !== chosenIndex) removedParts.push(splitParts[i]);
    }
    removedGeom = normalizeGeom(removedParts);
  } else {
    try {
      removedGeom = finalGeom.length === 0
        ? originalGeom
        : normalizeGeom(polygonClipping.difference(originalGeom, finalGeom));
    } catch (err) {
      console.warn("Could not derive removed geometry for animation", err);
      removedGeom = [];
    }
  }

  return { finalGeom, removedGeom };
}

/** Fraction of the paper's area a prospective cut would remove (0..1). */
export function getCutRemovalFraction(paperGeom, points, mode, outerBase) {
  const beforeArea = geomArea(paperGeom);
  if (!Number.isFinite(beforeArea) || beforeArea <= 0) return 1;
  const outcome = computeCutOutcome(paperGeom, points, mode, outerBase);
  if (!outcome) return 1;
  const afterArea = geomArea(outcome.finalGeom);
  return clamp((beforeArea - afterArea) / beforeArea, 0, 1);
}

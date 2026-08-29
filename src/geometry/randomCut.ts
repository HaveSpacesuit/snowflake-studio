// Generates a random, valid edge-to-edge cut for the "Random cut" button.
// Tries several curved candidates (crossing the paper, or leaving and returning
// to the same edge) and returns the first that validates and stays under the
// maximum removal fraction.

import { APEX, FOLD_BASE, MAX_RANDOM_CUT_REMOVAL_FRACTION } from "../constants.ts";
import { rand } from "../utils/math.ts";
import { getGeomBounds } from "./polygon.ts";
import { getCutRemovalFraction, sanitizeCutPath, validateCut } from "./cuts.ts";

function edgePoint(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function normalize2(v) {
  const mag = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / mag, y: v.y / mag };
}

function sampleCubic(p0, p1, p2, p3, segments) {
  const out = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const u = 1 - t;
    const x = u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x;
    const y = u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y;
    out.push({ x, y });
  }
  return out;
}

export function generateRandomValidCut(paperGeom, outerBase, maxAttempts = 140) {
  const bounds = getGeomBounds(paperGeom);
  if (!bounds) return null;

  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const span = Math.max(40, Math.max(bounds.width, bounds.height));
  const radius = span * 1.2 + 44;

  function makeCrossEdgeCandidate() {
    const angle = rand(0, Math.PI * 2);
    const normal = { x: Math.cos(angle), y: Math.sin(angle) };
    const tangent = { x: -normal.y, y: normal.x };
    const segments = 20 + Math.floor(rand(0, 15));
    const bowAmp = rand(span * 0.12, span * 0.34);
    const rippleAmp = rand(span * 0.03, span * 0.11);
    const rippleFreq = 1 + Math.floor(rand(1, 4));
    const phase = rand(0, Math.PI * 2);
    const points = [];

    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      const d = -radius + t * radius * 2;
      const fade = Math.sin(Math.PI * t);
      const bow = Math.sin(Math.PI * t) * bowAmp;
      const ripple = Math.sin(t * Math.PI * 2 * rippleFreq + phase) * rippleAmp * fade;
      const jitter = rand(-rippleAmp * 0.12, rippleAmp * 0.12) * fade;
      const offset = bow + ripple + jitter;

      points.push({
        x: cx + normal.x * d + tangent.x * offset,
        y: cy + normal.y * d + tangent.y * offset
      });
    }

    return points;
  }

  function makeSameEdgeCandidate() {
    const edges = [
      [APEX, FOLD_BASE],
      [FOLD_BASE, outerBase],
      [outerBase, APEX]
    ];
    const edge = edges[Math.floor(rand(0, edges.length))];
    const a = edge[0];
    const b = edge[1];
    const along = normalize2({ x: b.x - a.x, y: b.y - a.y });
    const mid = edgePoint(a, b, 0.5);
    const centroid = {
      x: (APEX.x + FOLD_BASE.x + outerBase.x) / 3,
      y: (APEX.y + FOLD_BASE.y + outerBase.y) / 3
    };
    const inward = normalize2({ x: centroid.x - mid.x, y: centroid.y - mid.y });

    const t0 = rand(0.1, 0.36);
    const t3 = rand(0.62, 0.9);
    const pEnter = edgePoint(a, b, t0);
    const pExit = edgePoint(a, b, t3);
    const outsidePad = rand(16, 30);
    const pStart = { x: pEnter.x - inward.x * outsidePad, y: pEnter.y - inward.y * outsidePad };
    const pEnd = { x: pExit.x - inward.x * outsidePad, y: pExit.y - inward.y * outsidePad };

    const depth = rand(span * 0.22, span * 0.42);
    const skew1 = rand(-span * 0.08, span * 0.08);
    const skew2 = rand(-span * 0.08, span * 0.08);
    const c1 = {
      x: pEnter.x + inward.x * depth + along.x * skew1,
      y: pEnter.y + inward.y * depth + along.y * skew1
    };
    const c2 = {
      x: pExit.x + inward.x * depth + along.x * skew2,
      y: pExit.y + inward.y * depth + along.y * skew2
    };

    const curve = sampleCubic(pEnter, c1, c2, pExit, 16 + Math.floor(rand(0, 10)));
    return [pStart].concat(curve, [pEnd]);
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const points = Math.random() < 0.45 ? makeSameEdgeCandidate() : makeCrossEdgeCandidate();

    const validation = validateCut(sanitizeCutPath(points), paperGeom);
    if (
      validation.valid &&
      validation.mode === "edge" &&
      getCutRemovalFraction(paperGeom, points, validation.mode, outerBase) <= MAX_RANDOM_CUT_REMOVAL_FRACTION
    ) {
      return points;
    }
  }

  const fallback = [
    { x: cx - radius, y: cy },
    { x: cx, y: cy + rand(-8, 8) },
    { x: cx + radius, y: cy }
  ];
  const fallbackValidation = validateCut(sanitizeCutPath(fallback), paperGeom);
  if (!fallbackValidation.valid || fallbackValidation.mode !== "edge") return null;
  return getCutRemovalFraction(paperGeom, fallback, fallbackValidation.mode, outerBase) <= MAX_RANDOM_CUT_REMOVAL_FRACTION
    ? fallback
    : null;
}

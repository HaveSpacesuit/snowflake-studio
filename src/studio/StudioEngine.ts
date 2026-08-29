// The Studio editor engine.
//
// This is the imperative heart of the app: it owns the mutable editor state,
// builds and updates the two SVG panels, runs the animation loop (spin, falling
// cut scraps, background snowfall), and handles all pointer/touch/wheel input.
//
// It is deliberately framework-agnostic. React mounts it against DOM refs and
// subscribes to status/history/option changes through the callbacks in
// `config`, and drives it through the returned public methods. All pure
// geometry and persistence logic lives in the imported utility modules.

import {
  APEX,
  CANVAS_BG,
  DISPLAY_HEIGHT,
  DISPLAY_WIDTH,
  EDGE_FINAL_TOL,
  EDGE_LOCK_MIN_PATH_LENGTH,
  EDGE_START_SNAP_TOL,
  FOLDED_BASE_ROTATION,
  SNAP_INTERIOR_MIN_LEAD,
  SNAP_OUTSIDE_LEAD,
  TOUCH_DRAG_TOL,
  TOUCH_LONG_PRESS_MS,
  UNFOLDED_ROTATE_SPEED,
  BG_FLAKE_COUNT,
  BG_FLAKE_MAX_SIZE,
  BG_FLAKE_MIN_SIZE,
  MAX_RANDOM_CUT_REMOVAL_FRACTION,
  MAX_VIEW_SCALE,
  MIN_VIEW_SCALE
} from "../constants.ts";
import { clamp, dist, rand } from "../utils/math.ts";
import {
  cloneGeom,
  computeGeomCenter,
  distanceToBoundary,
  geomArea,
  getGeomBounds,
  multiPolygonToPath,
  normalizeGeom,
  pointInGeom,
  pointsToPath,
  snapCutEndsIfClose,
  snapPointToBoundaryIfClose
} from "../geometry/polygon.ts";
import polygonClipping from "polygon-clipping";
import {
  computeCutOutcome,
  cutPathLength,
  getCutRemovalFraction,
  getLiveCutPreview,
  prettifyCutPath,
  sanitizeCutPath,
  validateCut
} from "../geometry/cuts.ts";
import { buildUnfoldedGeom } from "../geometry/unfold.ts";
import { buildUnfoldedOutlinePaths } from "../geometry/outline.ts";
import { generateRandomValidCut } from "../geometry/randomCut.ts";
import { clampViewToCanvas, resetView, zoomViewAtPoint } from "../geometry/view.ts";
import { createBasePaperGeomForSideCount, getOuterBaseForSideCount } from "../geometry/paper.ts";
import { normalizeSideCount, normalizeSnowflakeOptions } from "../snowflake/options.ts";
import { computeSnowflakeSignature, getBasePaperSignature } from "../snowflake/signature.ts";
import { buildExportSvgString } from "../snowflake/svgExport.ts";
import {
  loadActiveStudioState,
  normalizeStoredGeom,
  normalizeStoredGeomStack,
  persistActiveStudioState,
  removeActiveStudioState,
  saveSnowflakeToCollection
} from "../snowflake/storage.ts";
import {
  buildPanelSvg,
  createSvgElement,
  extractFoldedLayer,
  extractUnfoldedLayer
} from "./scene.ts";

const noop = () => {};
const TOOL_FREEHAND = "freehand";
const TOOL_STRAIGHT = "straight";
const TOOL_CIRCLE = "circle";
const TOOL_IDS = new Set([TOOL_FREEHAND, TOOL_STRAIGHT, TOOL_CIRCLE]);
const CIRCLE_RADIUS_MIN = 8;
const CIRCLE_RADIUS_MAX = 220;
const CIRCLE_RADIUS_DEFAULT = 34;

export function createStudioEngine(config) {
  const {
    foldedHost,
    unfoldedHost,
    backgroundCanvas,
    onStatus = noop,
    onHistory = noop,
    onOptions = noop,
    onCanSave = noop,
    onToolChange = noop,
    onCircleResizeMode = noop
  } = config;

  const backgroundCtx = backgroundCanvas.getContext("2d");
  backgroundCtx.imageSmoothingEnabled = true;

  const foldedSvg = buildPanelSvg("foldedCanvas", "Edit");
  const unfoldedSvg = buildPanelSvg("unfoldedCanvas", "Preview");
  foldedHost.appendChild(foldedSvg);
  unfoldedHost.appendChild(unfoldedSvg);

  const foldedLayer = extractFoldedLayer(foldedSvg);
  const unfoldedLayer = extractUnfoldedLayer(unfoldedSvg);
  const zoomBadgeTargets = Array.from(document.querySelectorAll("[data-zoom-badge-for]"));
  const zoomResetTargets = Array.from(document.querySelectorAll("[data-zoom-reset-for]"));

  const state = {
    drawing: false,
    currentCut: [],
    lockedCut: null,
    panning: false,
    panTarget: null,
    panPointerId: null,
    panLastPoint: null,
    paperGeom: null,
    unfoldedGeom: [],
    unfoldedDirty: true,
    undoStack: [],
    redoStack: [],
    livePreview: { mode: "none", text: "Ready" },
    activeTool: TOOL_FREEHAND,
    circleResizeMode: false,
    unfoldedSpinPaused: false,
    unfoldedSpinStartTime: performance.now(),
    unfoldedSpinAngle: 0,
    unfoldedBaseScale: null,
    touchStraightArmed: false,
    touchLongPressTimer: null,
    touchDrawStartPoint: null,
    touchDrawStartTime: 0,
    touchDrawMoved: false,
    circleCutRadius: CIRCLE_RADIUS_DEFAULT,
    circleHoverPoint: null,
    lastCollectionSavedSignature: null,
    options: normalizeSnowflakeOptions(null),
    touch: {
      folded: newTouchState(),
      unfolded: newTouchState()
    },
    fallingCuts: [],
    backgroundFlakes: [],
    lastFrameTime: performance.now(),
    foldedView: { scale: 1, offsetX: 0, offsetY: 0, rotation: FOLDED_BASE_ROTATION },
    unfoldedView: { scale: 1, offsetX: 0, offsetY: 0 }
  };

  let rafId = null;
  const documentListeners = [];
  const windowListeners = [];
  const zoomResetListeners = [];

  function newTouchState() {
    return {
      pointers: new Map(),
      pinchActive: false,
      circleResizeActive: false,
      startDistance: 0,
      startCircleRadius: CIRCLE_RADIUS_DEFAULT,
      startCenter: { x: 0, y: 0 },
      startScale: 1,
      startOffsetX: 0,
      startOffsetY: 0
    };
  }

  // -------------------------------------------------------------------------
  // Status + React-facing state sync
  // -------------------------------------------------------------------------

  function setStatus(text) {
    onStatus(text);
  }

  function getCurrentOuterBase() {
    return getOuterBaseForSideCount(state.options.sideCount);
  }

  function computeCollectionSignature() {
    return computeSnowflakeSignature(state.paperGeom, state.options);
  }

  function syncSaveToCollectionControl() {
    const signature = computeCollectionSignature();
    if (state.lastCollectionSavedSignature === null) {
      state.lastCollectionSavedSignature = signature;
    }
    onCanSave(signature !== state.lastCollectionSavedSignature);
  }

  function updateHistoryControls() {
    onHistory({ canUndo: state.undoStack.length > 0, canRedo: state.redoStack.length > 0 });
    syncSaveToCollectionControl();
    persistState();
  }

  function persistState() {
    const signature = computeCollectionSignature();
    const payload = {
      paperGeom: state.paperGeom,
      undoStack: state.undoStack,
      redoStack: state.redoStack,
      lastCollectionSavedSignature: state.lastCollectionSavedSignature,
      options: normalizeSnowflakeOptions(state.options)
    } as any;
    const previewSvg = getExportSvgString();
    if (previewSvg) payload.previewSvg = previewSvg;
    persistActiveStudioState(payload, signature);
  }

  // -------------------------------------------------------------------------
  // View transforms
  // -------------------------------------------------------------------------

  function applyViewTransform(group, view) {
    group.setAttribute("transform", `matrix(${view.scale} 0 0 ${view.scale} ${view.offsetX} ${view.offsetY})`);
  }

  function syncViewState(svg, view) {
    const nextZoomText = "Zoom: " + Math.round(view.scale * 100) + "%";
    svg.dataset.zoomScale = view.scale.toFixed(4);
    svg.dataset.zoomOffsetX = view.offsetX.toFixed(2);
    svg.dataset.zoomOffsetY = view.offsetY.toFixed(2);
    const badge = zoomBadgeTargets.find((el) => el.getAttribute("data-zoom-badge-for") === svg.dataset.panelCanvas);
    if (badge && badge.textContent !== nextZoomText) badge.textContent = nextZoomText;
    const resetButton = zoomResetTargets.find((el) => el.getAttribute("data-zoom-reset-for") === svg.dataset.panelCanvas);
    if (resetButton) resetButton.toggleAttribute("hidden", Math.abs(view.scale - 1) < 0.0001);
  }

  function syncAllViewState() {
    syncViewState(foldedSvg, state.foldedView);
    syncViewState(unfoldedSvg, state.unfoldedView);
  }

  function getSvgPoint(evt, svg, view = null) {
    const rect = svg.getBoundingClientRect();
    const sx = DISPLAY_WIDTH / rect.width;
    const sy = DISPLAY_HEIGHT / rect.height;
    const localX = (evt.clientX - rect.left) * sx;
    const localY = (evt.clientY - rect.top) * sy;
    if (!view) return { x: localX, y: localY };
    let point = {
      x: (localX - view.offsetX) / view.scale,
      y: (localY - view.offsetY) / view.scale
    };

    if (Number.isFinite(view.rotation) && Math.abs(view.rotation) > 1e-6) {
      const cx = DISPLAY_WIDTH / 2;
      const cy = DISPLAY_HEIGHT / 2;
      const dx = point.x - cx;
      const dy = point.y - cy;
      const ca = Math.cos(-view.rotation);
      const sa = Math.sin(-view.rotation);
      point = { x: cx + dx * ca - dy * sa, y: cy + dx * sa + dy * ca };
    }

    return point;
  }

  // -------------------------------------------------------------------------
  // Pan
  // -------------------------------------------------------------------------

  function beginPan(view, svg, pointerId, startPoint) {
    if (view.scale <= 1.0001) return false;
    state.panning = true;
    state.panTarget = { svg, view };
    state.panPointerId = pointerId;
    state.panLastPoint = startPoint;
    svg.setPointerCapture(pointerId);
    return true;
  }

  function updatePan(point) {
    if (!state.panning || !state.panTarget || !state.panLastPoint) return;
    const { svg, view } = state.panTarget;
    view.offsetX += point.x - state.panLastPoint.x;
    view.offsetY += point.y - state.panLastPoint.y;
    clampViewToCanvas(view);
    state.panLastPoint = point;
    syncViewState(svg, view);
    render();
  }

  function endPan(pointerId, svg) {
    if (!state.panning || state.panPointerId !== pointerId || !state.panTarget) return false;
    try {
      svg.releasePointerCapture(pointerId);
    } catch (_) {
      // ignore
    }
    state.panning = false;
    state.panTarget = null;
    state.panPointerId = null;
    state.panLastPoint = null;
    return true;
  }

  function stopPanning() {
    state.panning = false;
    state.panTarget = null;
    state.panPointerId = null;
    state.panLastPoint = null;
  }

  // -------------------------------------------------------------------------
  // Options
  // -------------------------------------------------------------------------

  function setSnowflakeOptions(nextOptions) {
    const merged = normalizeSnowflakeOptions(Object.assign({}, state.options, nextOptions));
    const current = normalizeSnowflakeOptions(state.options);
    if (JSON.stringify(current) === JSON.stringify(merged)) return false;

    state.options = merged;
    state.unfoldedDirty = true;
    onOptions(merged);
    syncSaveToCollectionControl();
    persistState();
    render();
    return true;
  }

  function hasSnowflakeChanges() {
    return computeCollectionSignature() !== getBasePaperSignature();
  }

  function syncToolState() {
    onToolChange(state.activeTool);
  }

  function syncCircleResizeMode() {
    onCircleResizeMode(state.circleResizeMode);
  }

  function setCircleResizeMode(enabled) {
    const nextMode = state.activeTool === TOOL_CIRCLE && Boolean(enabled);
    if (nextMode === state.circleResizeMode) return false;
    state.circleResizeMode = nextMode;
    syncCircleResizeMode();
    return true;
  }

  function setActiveTool(nextTool, { announce = false } = {}) {
    const normalized = typeof nextTool === "string" ? nextTool.toLowerCase() : "";
    if (!TOOL_IDS.has(normalized) || normalized === state.activeTool) return false;

    state.activeTool = normalized;
    state.touchStraightArmed = false;

    if (normalized !== TOOL_CIRCLE) {
      setCircleResizeMode(false);
      clearCirclePreview();
    } else if (announce) {
      setStatus(`Circle mode enabled: Ctrl + wheel adjusts radius (${Math.round(state.circleCutRadius)} px), then apply the cut.`);
    }

    syncToolState();
    render();
    return true;
  }

  function isCircleModeModifierActive(evt) {
    return !!evt && evt.pointerType !== "touch" && evt.ctrlKey && !evt.metaKey;
  }

  function isCircleToolActive(evt) {
    return state.activeTool === TOOL_CIRCLE || isCircleModeModifierActive(evt);
  }

  function getCircleCenterFromCursor(cursorPt) {
    return { x: cursorPt.x, y: cursorPt.y };
  }

  function buildCircleRing(center, radius) {
    const segments = Math.max(28, Math.min(120, Math.round(radius * 1.8)));
    const ring = [];
    for (let i = 0; i < segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2;
      ring.push([center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius]);
    }
    return ring;
  }

  function buildCirclePreviewPoints(cursorPt) {
    const center = getCircleCenterFromCursor(cursorPt);
    const ring = buildCircleRing(center, state.circleCutRadius);
    const points = ring.map(([x, y]) => ({ x, y }));
    if (points.length > 0) points.push({ x: points[0].x, y: points[0].y });
    return points;
  }

  function circleIntersectsPaperEdge(center, radius) {
    const segments = Math.max(36, Math.min(180, Math.round(radius * 2.2)));
    let sawInside = false;
    let sawOutside = false;
    let touchedBoundary = false;

    for (let i = 0; i < segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2;
      const pt = {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius
      };

      if (pointInGeom(pt, state.paperGeom)) sawInside = true;
      else sawOutside = true;

      if (!touchedBoundary && distanceToBoundary(pt, state.paperGeom) <= 1.2) {
        touchedBoundary = true;
      }

      if (touchedBoundary || (sawInside && sawOutside)) return true;
    }

    return false;
  }

  function isValidCircleCut(center, radius) {
    const fullyContained = pointInGeom(center, state.paperGeom) &&
      distanceToBoundary(center, state.paperGeom) >= radius - 1.2;
    return fullyContained || circleIntersectsPaperEdge(center, radius);
  }

  function updateCirclePreview(cursorPt, announce = true) {
    const circleCenter = getCircleCenterFromCursor(cursorPt);
    const valid = isValidCircleCut(circleCenter, state.circleCutRadius);
    state.circleHoverPoint = cursorPt;
    state.currentCut = buildCirclePreviewPoints(cursorPt);
    state.lockedCut = null;
    state.livePreview = {
      mode: valid ? "circle" : "invalid",
      text: valid
        ? `Circle mode: adjust radius (${Math.round(state.circleCutRadius)} px), then apply the cut.`
        : `Invalid circle: must overlap the folded paper (radius ${Math.round(state.circleCutRadius)} px).`
    };
    if (announce) setStatus(state.livePreview.text);
  }

  function clearCirclePreview() {
    state.circleHoverPoint = null;
    if (!state.drawing) {
      const wasCirclePreview = state.livePreview.mode === "circle";
      state.currentCut = [];
      state.lockedCut = null;
      state.livePreview = { mode: "none", text: "Ready" };
      if (wasCirclePreview) setStatus("Ready");
    }
  }

  function applyCircleCutAtCursor(cursorPt, maxRemovalFraction = null, radius = state.circleCutRadius) {
    if (!state.paperGeom || state.paperGeom.length === 0) {
      setStatus("No paper remaining for a circle cut.");
      return false;
    }

    const beforeGeom = cloneGeom(state.paperGeom);
    const beforeArea = geomArea(beforeGeom);
    const circleCenter = getCircleCenterFromCursor(cursorPt);

    if (!isValidCircleCut(circleCenter, radius)) {
      setStatus("Circle cut must overlap the folded paper.");
      updateCirclePreview(cursorPt, false);
      render();
      return false;
    }

    const ring = buildCircleRing(circleCenter, radius);
    const cutGeom = normalizeGeom([[ring]]);
    if (cutGeom.length === 0) {
      setStatus("Circle cut failed due to geometry precision.");
      return false;
    }

    let nextGeom;
    try {
      nextGeom = normalizeGeom(polygonClipping.difference(beforeGeom, cutGeom));
    } catch (err) {
      console.error("Circle cut boolean failed", err);
      setStatus("Circle cut failed due to geometry precision.");
      return false;
    }

    if (!nextGeom || nextGeom.length === 0) {
      setStatus("Circle cut removed all paper. Try a smaller radius.");
      return false;
    }

    const afterArea = geomArea(nextGeom);
    if (!Number.isFinite(afterArea) || afterArea >= beforeArea - 0.0001) {
      setStatus("Circle cut must overlap the folded paper to remove area.");
      return false;
    }

    if (maxRemovalFraction !== null && (beforeArea - afterArea) / beforeArea > maxRemovalFraction) {
      return false;
    }

    pushUndoSnapshot();
    state.paperGeom = nextGeom;
    state.unfoldedDirty = true;

    let removedGeom = [];
    try {
      removedGeom = normalizeGeom(polygonClipping.difference(beforeGeom, nextGeom));
    } catch (_) {
      removedGeom = [];
    }
    enqueueFallingCutAnimation(removedGeom);

    setStatus(
      `Circle cut applied (radius ${Math.round(radius)} px). Remaining area: ${Math.round(afterArea)} px`
    );
    updateHistoryControls();

    updateCirclePreview(cursorPt, false);
    render();
    return true;
  }

  function applyRandomCircleCut(maxAttempts = 420) {
    const bounds = getGeomBounds(state.paperGeom);
    if (!bounds) return false;
    const maxRadius = Math.min(CIRCLE_RADIUS_MAX, Math.max(CIRCLE_RADIUS_MIN, Math.min(bounds.width, bounds.height) * 0.22));

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const radius = rand(CIRCLE_RADIUS_MIN, maxRadius);
      const preferContained = attempt % 2 === 0;
      const padding = preferContained ? 0 : radius;
      const cursorPt = {
        x: rand(bounds.minX - padding, bounds.maxX + padding),
        y: rand(bounds.minY - padding, bounds.maxY + padding)
      };
      const fullyContained = pointInGeom(cursorPt, state.paperGeom) &&
        distanceToBoundary(cursorPt, state.paperGeom) >= radius - 1.2;
      if (preferContained ? !fullyContained : !circleIntersectsPaperEdge(cursorPt, radius)) continue;

      if (applyCircleCutAtCursor(cursorPt, MAX_RANDOM_CUT_REMOVAL_FRACTION, radius)) {
        state.circleHoverPoint = null;
        state.currentCut = [];
        state.lockedCut = null;
        state.livePreview = { mode: "none", text: "Ready" };
        render();
        return true;
      }
    }

    return false;
  }

  // -------------------------------------------------------------------------
  // Falling cut scrap animation
  // -------------------------------------------------------------------------

  function clearFallingCutAnimations() {
    for (const item of state.fallingCuts) {
      if (item.el && item.el.parentNode) item.el.parentNode.removeChild(item.el);
    }
    state.fallingCuts = [];
  }

  function enqueueFallingCutAnimation(geom) {
    if (!foldedLayer.fallingCuts || !geom || geom.length === 0) return;
    if (geomArea(geom) < 8) return;

    const path = multiPolygonToPath(geom);
    const bounds = getGeomBounds(geom);
    if (!path || !bounds) return;

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const centerBias = clamp((centerX - DISPLAY_WIDTH / 2) * 0.12, -22, 22);

    const el = createSvgElement("path", {
      d: path,
      fill: "#ffffff",
      "fill-rule": "evenodd",
      stroke: "#8fa5cf",
      "stroke-width": "1.3",
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
      opacity: "0.96"
    });
    foldedLayer.fallingCuts.appendChild(el);

    state.fallingCuts.push({
      el,
      bornAt: performance.now(),
      durationMs: rand(680, 980),
      driftX: centerBias + rand(-10, 10),
      fallY: clamp(bounds.height * 0.95 + 85, 80, 180),
      rotateDeg: rand(-8, 8),
      centerX,
      centerY,
      curlAmount: rand(0.45, 0.8),
      curlSkewDeg: rand(-12, 12),
      curlTwistDeg: rand(-9, 9),
      rollSign: Math.random() < 0.5 ? -1 : 1
    });

    if (state.fallingCuts.length > 16) {
      const old = state.fallingCuts.shift();
      if (old && old.el && old.el.parentNode) old.el.parentNode.removeChild(old.el);
    }
  }

  function updateFallingCutAnimations() {
    if (!foldedLayer.fallingCuts) return;
    const now = performance.now();
    const active = [];

    for (const item of state.fallingCuts) {
      const life = (now - item.bornAt) / item.durationMs;
      if (life >= 1) {
        if (item.el && item.el.parentNode) item.el.parentNode.removeChild(item.el);
        continue;
      }

      const eased = life * life;
      const tx = item.driftX * life;
      const ty = item.fallY * eased;
      const curlProgress = clamp(life * 1.2, 0, 1);
      const curlEase = 1 - Math.pow(1 - curlProgress, 3);
      const curl = item.curlAmount * curlEase;
      const rollProgress = clamp(life * 1.35, 0, 1);
      const rollEase = 1 - Math.pow(1 - rollProgress, 2);
      const tube = clamp(curl * (0.38 + 0.95 * rollEase), 0, 0.96);
      const dropShrink = 1 - 0.12 * eased;
      const sx = (1 - 0.62 * tube) * dropShrink;
      const sy = (1 - 0.16 * tube) * dropShrink;
      const skew = item.curlSkewDeg * curl + item.rollSign * 12 * tube;
      const rollTwist = item.rollSign * 24 * tube;
      const rot = item.rotateDeg * life + item.curlTwistDeg * curl + rollTwist;
      const axisDriftX = item.rollSign * 7 * tube;
      const axisDriftY = -4 * tube;

      item.el.setAttribute(
        "transform",
        `translate(${tx} ${ty}) rotate(${rot} ${item.centerX} ${item.centerY}) translate(${item.centerX} ${item.centerY}) translate(${axisDriftX} ${axisDriftY}) skewX(${skew}) scale(${sx} ${sy}) translate(${-item.centerX} ${-item.centerY})`
      );
      item.el.setAttribute("opacity", (0.96 * (1 - life)).toFixed(3));
      active.push(item);
    }

    state.fallingCuts = active;
  }

  // -------------------------------------------------------------------------
  // Unfolded geometry + spin
  // -------------------------------------------------------------------------

  function updateUnfoldedGeom() {
    if (!state.unfoldedDirty) return;
    state.unfoldedGeom = buildUnfoldedGeom(
      state.paperGeom,
      state.options.sideCount,
      state.unfoldedGeom,
      () => setStatus("Geometry issue detected on this cut; keeping last stable snowflake.")
    );
    state.unfoldedDirty = false;
  }

  function getDisplayedCutPoints(points) {
    if (state.livePreview.mode === "circle" || state.livePreview.mode === "invalid" || points.length < 3) return points;
    const pretty = prettifyCutPath(points);
    return pretty.length >= 2 ? pretty : points;
  }

  function getUnfoldedDisplayFit() {
    const dynamicFit = computeGeomCenter(state.unfoldedGeom, DISPLAY_WIDTH, DISPLAY_HEIGHT);
    if (!Number.isFinite(state.unfoldedBaseScale) || state.unfoldedBaseScale <= 0) {
      state.unfoldedBaseScale = dynamicFit.scale;
    }
    return { x: dynamicFit.x, y: dynamicFit.y, scale: state.unfoldedBaseScale };
  }

  function getUnfoldedSpinAngle() {
    if (state.unfoldedSpinPaused) return state.unfoldedSpinAngle;
    return ((performance.now() - state.unfoldedSpinStartTime) / 1000) * UNFOLDED_ROTATE_SPEED;
  }

  function syncSpinState() {
    unfoldedSvg.dataset.spinPaused = String(state.unfoldedSpinPaused);
    unfoldedSvg.setAttribute("aria-pressed", String(state.unfoldedSpinPaused));
  }

  function toggleUnfoldedSpin() {
    if (state.unfoldedSpinPaused) {
      state.unfoldedSpinPaused = false;
      state.unfoldedSpinStartTime = performance.now() - (state.unfoldedSpinAngle / UNFOLDED_ROTATE_SPEED) * 1000;
    } else {
      state.unfoldedSpinAngle = getUnfoldedSpinAngle();
      state.unfoldedSpinPaused = true;
    }
    syncSpinState();
    render();
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  function updateFoldedSvg() {
    const path = multiPolygonToPath(state.paperGeom);
    foldedLayer.paper.setAttribute("d", path);
    foldedLayer.paper.setAttribute("fill", "#ffffff");
    foldedLayer.border.setAttribute("d", path);
    updateFallingCutAnimations();

    if (state.currentCut.length > 1) {
      const drawPoints = getDisplayedCutPoints(state.currentCut);
      foldedLayer.liveCut.setAttribute("d", pointsToPath(drawPoints.map((p) => [p.x, p.y])));
      const previewStroke = state.livePreview.mode === "edge" || state.livePreview.mode === "circle" ? "#6fd7ff" : "#ff7ca8";
      foldedLayer.liveCut.setAttribute("stroke", previewStroke);
      foldedLayer.liveCut.style.display = "";
    } else {
      foldedLayer.liveCut.style.display = "none";
      foldedLayer.liveCut.setAttribute("d", "");
    }

    const paperArea = geomArea(state.paperGeom);
    foldedSvg.dataset.paperPixels = String(Math.round(paperArea));
    (window as any).__snowflakePaperPixels = Math.round(paperArea);
    (window as any).__snowflakePaperArea = paperArea;
  }

  function updateUnfoldedSvg() {
    updateUnfoldedGeom();
    const snowflakePath = multiPolygonToPath(state.unfoldedGeom);
    const outlines = buildUnfoldedOutlinePaths(state.unfoldedGeom);
    const options = normalizeSnowflakeOptions(state.options);
    const showBody = options.previewMode !== "outline";
    const showOutline = options.previewMode !== "body";
    unfoldedLayer.paper.setAttribute("d", snowflakePath);
    unfoldedLayer.paper.setAttribute("fill", showBody ? options.snowflakeColor : "none");
    unfoldedLayer.outlineOuter.setAttribute("d", outlines.outerPath);
    unfoldedLayer.outlineHoles.setAttribute("d", outlines.holePath);
    unfoldedLayer.outlineOuter.setAttribute("stroke", showOutline ? options.outlineExteriorColor : "none");
    unfoldedLayer.outlineHoles.setAttribute("stroke", showOutline ? options.outlineInteriorColor : "none");
    unfoldedLayer.outlineOuter.setAttribute("stroke-width", options.outlineExteriorWidth.toFixed(1));
    unfoldedLayer.outlineHoles.setAttribute("stroke-width", options.outlineInteriorWidth.toFixed(1));

    const fit = getUnfoldedDisplayFit();
    const spin = getUnfoldedSpinAngle();
    unfoldedLayer.spin.setAttribute(
      "transform",
      `translate(${DISPLAY_WIDTH / 2} ${DISPLAY_HEIGHT / 2}) rotate(${(spin * 180) / Math.PI}) scale(${fit.scale}) translate(${-fit.x} ${-fit.y})`
    );
  }

  function render() {
    foldedLayer.bg.setAttribute("fill", CANVAS_BG);
    unfoldedLayer.bg.setAttribute("fill", CANVAS_BG);
    if (foldedLayer.paperScene) {
      const rotationDeg = (state.foldedView.rotation * 180) / Math.PI;
      foldedLayer.paperScene.setAttribute("transform", `rotate(${rotationDeg} ${DISPLAY_WIDTH / 2} ${DISPLAY_HEIGHT / 2})`);
    }
    updateFoldedSvg();
    updateUnfoldedSvg();
    applyViewTransform(foldedLayer.viewport, state.foldedView);
    applyViewTransform(unfoldedLayer.viewport, state.unfoldedView);
    drawBackgroundFlakes();
  }

  // -------------------------------------------------------------------------
  // Export / save
  // -------------------------------------------------------------------------

  function getExportSvgString() {
    updateUnfoldedGeom();
    return buildExportSvgString(state.unfoldedGeom, state.options, state.unfoldedBaseScale, getUnfoldedSpinAngle());
  }

  function makeExportFilename() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    return `snowflake-${stamp}.svg`;
  }

  function downloadSvgText(svgText, filename) {
    const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function addCurrentSnowflakeToCollection() {
    const svgText = getExportSvgString();
    if (!svgText) {
      setStatus("Nothing to add yet.");
      return;
    }
    if (!saveSnowflakeToCollection({ svg: svgText, paperGeom: state.paperGeom, options: state.options })) {
      setStatus("Could not save to collection (storage unavailable).");
      return;
    }
    state.lastCollectionSavedSignature = computeCollectionSignature();
    syncSaveToCollectionControl();
    setStatus("Saved to collection.");
  }

  function exportSnowflakeSvg() {
    const svgText = getExportSvgString();
    if (!svgText) {
      setStatus("Nothing to export yet.");
      return;
    }
    downloadSvgText(svgText, makeExportFilename());
    setStatus("SVG downloaded.");
  }

  // -------------------------------------------------------------------------
  // Background snowfall
  // -------------------------------------------------------------------------

  function resizeBackgroundCanvas() {
    const w = Math.max(1, Math.floor(window.innerWidth));
    const h = Math.max(1, Math.floor(window.innerHeight));
    if (backgroundCanvas.width !== w) backgroundCanvas.width = w;
    if (backgroundCanvas.height !== h) backgroundCanvas.height = h;
  }

  function createBackgroundFlake(initial) {
    const w = backgroundCanvas.width;
    const h = backgroundCanvas.height;
    const size = rand(BG_FLAKE_MIN_SIZE, BG_FLAKE_MAX_SIZE);
    const margin = size * 1.4;
    return {
      size,
      baseX: rand(-margin, w + margin),
      y: initial ? rand(-margin, h + margin) : rand(-h * 0.35 - margin, -margin),
      speed: rand(16, 44),
      driftAmp: rand(8, Math.max(20, size * 1.2)),
      driftFreq: rand(0.7, 1.6),
      driftPhase: rand(0, Math.PI * 2),
      meander: rand(-22, 22),
      spin: rand(-0.6, 0.6),
      rotation: rand(0, Math.PI * 2),
      flipAxis: rand(0, 1),
      flipPhase: rand(0, Math.PI * 2),
      flipSpeed: rand(0.9, 2.1),
      alpha: rand(0.12, 0.28)
    };
  }

  function ensureBackgroundFlakes() {
    if (state.backgroundFlakes.length === BG_FLAKE_COUNT) return;
    state.backgroundFlakes = [];
    for (let i = 0; i < BG_FLAKE_COUNT; i += 1) state.backgroundFlakes.push(createBackgroundFlake(true));
  }

  function updateBackgroundFlakes(dt) {
    const w = backgroundCanvas.width;
    const h = backgroundCanvas.height;
    for (let i = 0; i < state.backgroundFlakes.length; i += 1) {
      const f = state.backgroundFlakes[i];
      f.y += f.speed * dt;
      f.driftPhase += f.driftFreq * dt;
      f.rotation += f.spin * dt;
      f.flipPhase += f.flipSpeed * dt;
      f.baseX += f.meander * dt * 0.2;
      const margin = f.size * 2;
      if (f.y - margin > h) {
        state.backgroundFlakes[i] = createBackgroundFlake(false);
        continue;
      }
      if (f.baseX < -margin) f.baseX = w + margin;
      else if (f.baseX > w + margin) f.baseX = -margin;
    }
  }

  function drawBackgroundFlakes() {
    backgroundCtx.setTransform(1, 0, 0, 1, 0, 0);
    backgroundCtx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);

    if (!state.unfoldedGeom || state.unfoldedGeom.length === 0) return;

    const fit = getUnfoldedDisplayFit();
    const flakePath = new Path2D();
    for (const polygon of state.unfoldedGeom) {
      for (const ring of polygon) {
        if (!ring || ring.length < 3) continue;
        flakePath.moveTo(ring[0][0], ring[0][1]);
        for (let i = 1; i < ring.length; i += 1) flakePath.lineTo(ring[i][0], ring[i][1]);
        flakePath.closePath();
      }
    }

    for (const f of state.backgroundFlakes) {
      const flutterX = Math.sin(f.driftPhase) * f.driftAmp + Math.sin(f.driftPhase * 2.7) * f.driftAmp * 0.28;
      const x = f.baseX + flutterX;
      const flipWave = Math.sin(f.flipPhase);
      const flipAbs = Math.abs(flipWave);
      const squashA = 0.26 + flipAbs * 0.74;
      const squashB = 0.58 + (1 - flipAbs) * 0.42;
      const axisBlend = f.flipAxis;
      const sx = axisBlend < 0.5 ? squashA * Math.sign(flipWave || 1) : squashB;
      const sy = axisBlend > 0.5 ? squashA : squashB;

      backgroundCtx.save();
      backgroundCtx.globalAlpha = f.alpha;
      backgroundCtx.translate(x, f.y);
      backgroundCtx.rotate(f.rotation);
      backgroundCtx.scale((f.size / DISPLAY_WIDTH) * sx * fit.scale, (f.size / DISPLAY_HEIGHT) * sy * fit.scale);
      backgroundCtx.translate(DISPLAY_WIDTH / 2 - fit.x, DISPLAY_HEIGHT / 2 - fit.y);
      backgroundCtx.fillStyle = "#ffffff";
      backgroundCtx.fill(flakePath, "evenodd");
      backgroundCtx.restore();
    }
  }

  // -------------------------------------------------------------------------
  // History + cut application
  // -------------------------------------------------------------------------

  function pushUndoSnapshot() {
    state.undoStack.push(cloneGeom(state.paperGeom));
    state.redoStack = [];
  }

  function applyCut(points, mode) {
    const outcome = computeCutOutcome(state.paperGeom, points, mode, getCurrentOuterBase());
    if (!outcome) return false;
    state.paperGeom = outcome.finalGeom;
    state.unfoldedDirty = true;
    return { applied: true, removedGeom: outcome.removedGeom };
  }

  function cutValidationOptions() {
    return { requireStartOutside: state.activeTool === TOOL_FREEHAND };
  }

  function finalizeCut() {
    const input = state.lockedCut ? state.lockedCut.slice() : state.currentCut.slice();
    if (input.length < 2) {
      resetCutDraft("Ready");
      render();
      return;
    }

    const options = cutValidationOptions();
    let cut = sanitizeCutPath(input);
    let validation = validateCut(cut, state.paperGeom, options);

    if (!validation.valid) {
      const snappedStart = snapCutEndsIfClose(cut, state.paperGeom, EDGE_START_SNAP_TOL);
      const snappedStartValidation = validateCut(snappedStart, state.paperGeom, options);
      if (snappedStartValidation.valid) {
        cut = snappedStart;
        validation = snappedStartValidation;
      }
    }

    if (!validation.valid) {
      const snappedFinal = snapCutEndsIfClose(cut, state.paperGeom, EDGE_FINAL_TOL);
      const snappedFinalValidation = validateCut(snappedFinal, state.paperGeom, options);
      if (snappedFinalValidation.valid) {
        cut = snappedFinal;
        validation = snappedFinalValidation;
      }
    }

    if (!validation.valid) {
      setStatus("Rejected: " + validation.reason);
      resetCutDraft("Ready");
      render();
      return;
    }

    let prettified = false;
    const prettyCut = prettifyCutPath(cut);
    if (prettyCut.length >= 2) {
      const prettyValidation = validateCut(prettyCut, state.paperGeom, options);
      if (prettyValidation.valid && prettyValidation.mode === validation.mode) {
        cut = prettyCut;
        validation = prettyValidation;
        prettified = true;
      }
    }

    const beforeArea = geomArea(state.paperGeom);
    const beforeGeom = cloneGeom(state.paperGeom);
    pushUndoSnapshot();
    const cutResult = applyCut(cut, validation.mode);
    if (!cutResult || !cutResult.applied) {
      state.undoStack.pop();
      state.paperGeom = beforeGeom;
      state.redoStack = [];
      setStatus("Cut failed due to geometry precision. Try a slightly simpler stroke.");
      resetCutDraft("Ready");
      updateHistoryControls();
      render();
      return;
    }
    enqueueFallingCutAnimation(cutResult.removedGeom);
    const afterArea = geomArea(state.paperGeom);

    if (afterArea >= beforeArea) {
      setStatus("Cut accepted (" + validation.reason + "), but no removable piece detected.");
    } else {
      setStatus(
        "Accepted (" + validation.reason + (prettified ? ", prettified" : "") + "). Components: " +
          state.paperGeom.length + ", remaining area: " + Math.round(afterArea) + " px"
      );
    }

    resetCutDraft(null);
    updateHistoryControls();
    render();
  }

  function resetCutDraft(statusText) {
    state.currentCut = [];
    state.lockedCut = null;
    state.livePreview = { mode: "none", text: statusText || "Ready" };
    if (statusText) state.livePreview.text = statusText;
  }

  function undoLastCut() {
    if (state.undoStack.length === 0) return;
    clearFallingCutAnimations();
    state.redoStack.push(cloneGeom(state.paperGeom));
    state.paperGeom = state.undoStack.pop();
    state.unfoldedDirty = true;
    state.currentCut = [];
    state.lockedCut = null;
    state.livePreview = { mode: "none", text: "Ready" };
    setStatus("Undid last cut.");
    updateHistoryControls();
    render();
  }

  function redoLastCut() {
    if (state.redoStack.length === 0) return;
    clearFallingCutAnimations();
    state.undoStack.push(cloneGeom(state.paperGeom));
    state.paperGeom = state.redoStack.pop();
    state.unfoldedDirty = true;
    state.currentCut = [];
    state.lockedCut = null;
    state.livePreview = { mode: "none", text: "Ready" };
    setStatus("Redid last cut.");
    updateHistoryControls();
    render();
  }

  function handleHistoryShortcut(evt) {
    const isMac = navigator.platform.toLowerCase().includes("mac");
    const modifierPressed = isMac ? evt.metaKey : evt.ctrlKey;
    if (!modifierPressed || evt.altKey) return;
    const key = evt.key.toLowerCase();
    if (key === "z" && !evt.shiftKey) {
      evt.preventDefault();
      undoLastCut();
    } else if (key === "y" || (key === "z" && evt.shiftKey)) {
      evt.preventDefault();
      redoLastCut();
    }
  }

  function applyRandomCut() {
    if (state.drawing || state.panning) return;
    if (!state.paperGeom || state.paperGeom.length === 0) {
      setStatus("No paper remaining for a random cut.");
      return;
    }

    if (state.activeTool === TOOL_CIRCLE) {
      if (!applyRandomCircleCut()) {
        setStatus("Could not find a valid circle cut. Try again.");
      }
      return;
    }

    const randomCut = generateRandomValidCut(
      state.paperGeom,
      getCurrentOuterBase(),
      420,
      state.activeTool
    );
    if (!randomCut) {
      setStatus("Could not find a valid random cut under 25% removal. Try again.");
      return;
    }

    state.currentCut = randomCut;
    state.lockedCut = null;
    state.livePreview = { mode: "edge", text: "Edge-to-edge ready: release to cut." };
    render();
    finalizeCut();
  }

  // -------------------------------------------------------------------------
  // Reset / restore
  // -------------------------------------------------------------------------

  function clearInteractionState() {
    clearFallingCutAnimations();
    clearTouchLongPressArm();
    clearTouchPointers(state.touch.folded);
    clearTouchPointers(state.touch.unfolded);
    state.touchStraightArmed = false;
    state.circleHoverPoint = null;
    state.touchDrawStartPoint = null;
    state.touchDrawStartTime = 0;
    state.touchDrawMoved = false;
  }

  function resetPaper(nextOptions = normalizeSnowflakeOptions(null), readyStatus = "Ready") {
    clearInteractionState();
    state.options = normalizeSnowflakeOptions(nextOptions);
    state.paperGeom = createBasePaperGeomForSideCount(state.options.sideCount);
    state.lastCollectionSavedSignature = computeCollectionSignature();
    state.unfoldedGeom = [];
    state.unfoldedDirty = true;
    state.unfoldedBaseScale = null;
    state.currentCut = [];
    state.lockedCut = null;
    state.undoStack = [];
    state.redoStack = [];
    stopPanning();
    resetView(state.foldedView);
    resetView(state.unfoldedView);
    setStatus(readyStatus);
    onOptions(state.options);
    updateHistoryControls();
    syncSpinState();
    syncAllViewState();
    render();
  }

  function tryRestoreActiveStudioState() {
    const parsed = loadActiveStudioState();
    if (!parsed) return false;

    const restoredPaper = normalizeStoredGeom(parsed.paperGeom);
    if (!restoredPaper) return false;
    const restoredOptions = normalizeSnowflakeOptions(parsed.options);

    const restoredSignature = computeSnowflakeSignature(restoredPaper, restoredOptions);
    if (restoredSignature === getBasePaperSignature()) {
      removeActiveStudioState();
      return false;
    }

    clearInteractionState();
    state.paperGeom = restoredPaper;
    state.unfoldedGeom = [];
    state.unfoldedDirty = true;
    state.unfoldedBaseScale = null;
    state.currentCut = [];
    state.lockedCut = null;
    state.undoStack = normalizeStoredGeomStack(parsed.undoStack);
    state.redoStack = normalizeStoredGeomStack(parsed.redoStack);
    stopPanning();
    state.options = restoredOptions;
    state.lastCollectionSavedSignature = typeof parsed.lastCollectionSavedSignature === "string"
      ? parsed.lastCollectionSavedSignature
      : restoredSignature;

    resetView(state.foldedView);
    resetView(state.unfoldedView);
    setStatus("Restored previous snowflake.");
    onOptions(state.options);
    updateHistoryControls();
    syncSpinState();
    syncAllViewState();
    render();
    return true;
  }

  // -------------------------------------------------------------------------
  // Cut drafting helpers
  // -------------------------------------------------------------------------

  function addPointToCurrentCut(pt) {
    const pts = state.currentCut;
    if (pts.length === 0) {
      pts.push(pt);
      return;
    }
    if (dist(pts[pts.length - 1], pt) >= 1.5) pts.push(pt);
  }

  function updateShiftConstrainedCut(pt) {
    if (state.currentCut.length === 0) {
      state.currentCut = [pt];
      return;
    }
    state.currentCut = [state.currentCut[0], pt];
  }

  function isStraightModeActive(evt) {
    return !!(
      state.activeTool === TOOL_STRAIGHT ||
      evt.shiftKey ||
      (evt.pointerType === "touch" && state.touchStraightArmed)
    );
  }

  // -------------------------------------------------------------------------
  // Zoom + touch
  // -------------------------------------------------------------------------

  function handleWheelZoom(evt, svg, view) {
    evt.preventDefault();
    const focus = getSvgPoint(evt, svg);
    if (zoomViewAtPoint(view, focus.x, focus.y, evt.deltaY)) {
      syncViewState(svg, view);
      render();
    }
  }

  function resetZoom(svg, view) {
    resetView(view);
    syncViewState(svg, view);
    render();
  }

  function handleMiddlePanPointerDown(evt, svg, view) {
    if (evt.button !== 1) return false;
    evt.preventDefault();
    return beginPan(view, svg, evt.pointerId, getSvgPoint(evt, svg));
  }

  function handlePanPointerMove(evt, svg) {
    if (!state.panning || state.panPointerId !== evt.pointerId) return false;
    evt.preventDefault();
    updatePan(getSvgPoint(evt, svg));
    return true;
  }

  function handlePanPointerUp(evt, svg) {
    if (!state.panning || state.panPointerId !== evt.pointerId) return false;
    evt.preventDefault();
    return endPan(evt.pointerId, svg);
  }

  function getTouchState(svg) {
    return svg === foldedSvg ? state.touch.folded : state.touch.unfolded;
  }

  function touchDistance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function touchCenter(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function startTouchPinch(svg, view, tState) {
    clearTouchLongPressArm();
    const pointers = Array.from(tState.pointers.values());
    if (pointers.length < 2) return;

    const distNow = touchDistance(pointers[0], pointers[1]);
    if (distNow < 4) return;

    tState.pinchActive = true;
    tState.circleResizeActive = svg === foldedSvg && state.activeTool === TOOL_CIRCLE && state.circleResizeMode;
    tState.startDistance = distNow;
    tState.startCircleRadius = state.circleCutRadius;
    tState.startCenter = touchCenter(pointers[0], pointers[1]);
    tState.startScale = view.scale;
    tState.startOffsetX = view.offsetX;
    tState.startOffsetY = view.offsetY;

    if (svg === foldedSvg && state.drawing) {
      state.drawing = false;
      state.currentCut = [];
      state.lockedCut = null;
      state.livePreview = { mode: "none", text: "Ready" };
    }
  }

  function updateTouchPinch(svg, view, tState) {
    const pointers = Array.from(tState.pointers.values());
    if (pointers.length < 2 || !tState.pinchActive || tState.startDistance <= 0) return false;

    const centerNow = touchCenter(pointers[0], pointers[1]);
    const distNow = touchDistance(pointers[0], pointers[1]);
    if (distNow < 4) return false;

    if (tState.circleResizeActive) {
      state.circleCutRadius = clamp(
        tState.startCircleRadius * (distNow / tState.startDistance),
        CIRCLE_RADIUS_MIN,
        CIRCLE_RADIUS_MAX
      );
      if (state.circleHoverPoint) updateCirclePreview(state.circleHoverPoint);
      render();
      return true;
    }

    const nextScale = clamp(tState.startScale * (distNow / tState.startDistance), MIN_VIEW_SCALE, MAX_VIEW_SCALE);
    const worldX = (tState.startCenter.x - tState.startOffsetX) / tState.startScale;
    const worldY = (tState.startCenter.y - tState.startOffsetY) / tState.startScale;

    view.scale = nextScale;
    view.offsetX = centerNow.x - worldX * nextScale;
    view.offsetY = centerNow.y - worldY * nextScale;
    clampViewToCanvas(view);
    syncViewState(svg, view);
    render();
    return true;
  }

  function clearTouchPointers(tState) {
    tState.pointers.clear();
    tState.pinchActive = false;
    tState.circleResizeActive = false;
    tState.startDistance = 0;
  }

  function clearTouchLongPressArm() {
    if (state.touchLongPressTimer !== null) {
      clearTimeout(state.touchLongPressTimer);
      state.touchLongPressTimer = null;
    }
  }

  function scheduleTouchLongPressArm() {
    clearTouchLongPressArm();
    state.touchLongPressTimer = setTimeout(() => {
      state.touchLongPressTimer = null;
      if (!state.drawing) return;
      if (!state.touchDrawStartPoint || state.touchDrawMoved) return;
      const tState = getTouchState(foldedSvg);
      if (tState.pinchActive || tState.pointers.size >= 2) return;

      state.touchStraightArmed = true;
      state.currentCut = [{ x: state.touchDrawStartPoint.x, y: state.touchDrawStartPoint.y }];
      state.lockedCut = null;
      state.livePreview = { mode: "none", text: "Straight-line mode armed: drag to cut." };
      setStatus(state.livePreview.text);
      render();
    }, TOUCH_LONG_PRESS_MS);
  }

  // -------------------------------------------------------------------------
  // Pointer handlers
  // -------------------------------------------------------------------------

  function onFoldedPointerDown(evt) {
    if (evt.pointerType === "touch") {
      evt.preventDefault();
      const tState = getTouchState(foldedSvg);
      foldedSvg.setPointerCapture(evt.pointerId);
      tState.pointers.set(evt.pointerId, getSvgPoint(evt, foldedSvg));
      if (tState.pointers.size >= 2) {
        startTouchPinch(foldedSvg, state.foldedView, tState);
        return;
      }

      if (state.activeTool === TOOL_CIRCLE) {
        const pt = getSvgPoint(evt, foldedSvg, state.foldedView);
        state.touchDrawStartPoint = { x: pt.x, y: pt.y };
        state.touchDrawMoved = false;
        state.touchDrawStartTime = performance.now();
        updateCirclePreview(pt);
        render();
        return;
      }
    }

    if (evt.pointerType !== "touch" && evt.button === 0 && isCircleToolActive(evt)) {
      evt.preventDefault();
      const pt = getSvgPoint(evt, foldedSvg, state.foldedView);
      updateCirclePreview(pt);
      applyCircleCutAtCursor(pt);
      return;
    }

    if (handleMiddlePanPointerDown(evt, foldedSvg, state.foldedView)) return;
    if (evt.button !== 0) return;
    const rawPt = getSvgPoint(evt, foldedSvg, state.foldedView);
    const snappedStart = snapPointToBoundaryIfClose(rawPt, state.paperGeom, EDGE_START_SNAP_TOL);
    const nearEdge = dist(rawPt, snappedStart) <= EDGE_START_SNAP_TOL + 0.001;
    const applySnapNow = pointInGeom(rawPt, state.paperGeom) && nearEdge;
    const pt = applySnapNow ? snappedStart : rawPt;

    let initialInteriorPt = rawPt;
    let initialOutsidePt = snappedStart;
    if (applySnapNow) {
      const vx = rawPt.x - snappedStart.x;
      const vy = rawPt.y - snappedStart.y;
      const mag = Math.hypot(vx, vy);
      if (mag > 1e-6 && mag < SNAP_INTERIOR_MIN_LEAD) {
        const scale = SNAP_INTERIOR_MIN_LEAD / mag;
        initialInteriorPt = { x: snappedStart.x + vx * scale, y: snappedStart.y + vy * scale };
      }
      if (mag > 1e-6) {
        const outScale = SNAP_OUTSIDE_LEAD / mag;
        initialOutsidePt = { x: snappedStart.x - vx * outScale, y: snappedStart.y - vy * outScale };
      }
    }

    state.drawing = true;
    state.currentCut = applySnapNow
      ? [
          { x: initialOutsidePt.x, y: initialOutsidePt.y },
          { x: snappedStart.x, y: snappedStart.y },
          { x: initialInteriorPt.x, y: initialInteriorPt.y }
        ]
      : [pt];
    state.lockedCut = null;
    state.touchDrawStartPoint = evt.pointerType === "touch" ? { x: rawPt.x, y: rawPt.y } : null;
    state.touchDrawMoved = false;
    state.touchDrawStartTime = evt.pointerType === "touch" ? performance.now() : 0;
    if (evt.pointerType === "touch") scheduleTouchLongPressArm();
    state.livePreview = { mode: "none", text: "Drawing..." };
    setStatus(state.livePreview.text);
    foldedSvg.setPointerCapture(evt.pointerId);
    render();
  }

  function onFoldedPointerMove(evt) {
    if (!state.drawing && evt.pointerType !== "touch") {
      const hoverPt = getSvgPoint(evt, foldedSvg, state.foldedView);
      if (isCircleToolActive(evt)) {
        updateCirclePreview(hoverPt);
        render();
        return;
      }
      if (state.circleHoverPoint) {
        clearCirclePreview();
        render();
      }
    }

    if (evt.pointerType === "touch") {
      const tState = getTouchState(foldedSvg);
      if (tState.pointers.has(evt.pointerId)) {
        tState.pointers.set(evt.pointerId, getSvgPoint(evt, foldedSvg));
      }
      if (tState.pinchActive || tState.pointers.size >= 2) {
        if (!tState.pinchActive && tState.pointers.size >= 2) {
          startTouchPinch(foldedSvg, state.foldedView, tState);
        }
        if (updateTouchPinch(foldedSvg, state.foldedView, tState)) return;
      }

      if (!state.drawing && state.activeTool === TOOL_CIRCLE) {
        const pt = getSvgPoint(evt, foldedSvg, state.foldedView);
        if (state.touchDrawStartPoint && dist(state.touchDrawStartPoint, pt) > TOUCH_DRAG_TOL) {
          state.touchDrawMoved = true;
        }
        updateCirclePreview(pt, false);
        render();
        return;
      }
    }

    if (handlePanPointerMove(evt, foldedSvg)) return;
    if (!state.drawing) return;

    if (state.lockedCut && evt.shiftKey) state.lockedCut = null;

    if (state.lockedCut) {
      setStatus(state.livePreview.text);
      render();
      return;
    }

    const pt = getSvgPoint(evt, foldedSvg, state.foldedView);
    if (evt.pointerType === "touch" && state.touchDrawStartPoint && dist(state.touchDrawStartPoint, pt) > TOUCH_DRAG_TOL) {
      state.touchDrawMoved = true;
      clearTouchLongPressArm();
    }
    if (isStraightModeActive(evt)) {
      updateShiftConstrainedCut(pt);
    } else {
      addPointToCurrentCut(pt);
    }
    state.livePreview = getLiveCutPreview(state.currentCut, state.paperGeom, cutValidationOptions());

    if (!isStraightModeActive(evt) && state.livePreview.mode === "edge") {
      if (cutPathLength(state.currentCut) >= EDGE_LOCK_MIN_PATH_LENGTH) {
        state.lockedCut = state.currentCut.slice();
        state.livePreview = { mode: "edge", text: "Edge-to-edge locked: release to cut." };
      }
    }

    setStatus(state.livePreview.text);
    render();
  }

  function onFoldedPointerUp(evt) {
    clearTouchLongPressArm();
    if (evt.pointerType === "touch") {
      const tState = getTouchState(foldedSvg);
      const wasPinch = tState.pinchActive;
      tState.pointers.delete(evt.pointerId);
      if (tState.pointers.size < 2) {
        tState.pinchActive = false;
        tState.circleResizeActive = false;
        tState.startDistance = 0;
      }
      if (wasPinch && !state.drawing) {
        state.touchDrawStartPoint = null;
        state.touchDrawMoved = false;
        state.touchDrawStartTime = 0;
        return;
      }

      if (state.activeTool === TOOL_CIRCLE && !state.drawing) {
        const pt = getSvgPoint(evt, foldedSvg, state.foldedView);
        if (state.touchDrawStartPoint && dist(state.touchDrawStartPoint, pt) > TOUCH_DRAG_TOL) {
          state.touchDrawMoved = true;
        }

        if (!state.touchDrawMoved) {
          updateCirclePreview(pt, false);
          applyCircleCutAtCursor(pt);
        } else {
          updateCirclePreview(pt, false);
          render();
        }

        try {
          foldedSvg.releasePointerCapture(evt.pointerId);
        } catch (_) {
          // ignore
        }
        state.touchDrawStartPoint = null;
        state.touchDrawMoved = false;
        state.touchDrawStartTime = 0;
        return;
      }
    }

    if (handlePanPointerUp(evt, foldedSvg)) return;
    if (!state.drawing) return;
    state.drawing = false;

    if (evt.pointerType === "touch" && !state.touchDrawMoved) {
      state.currentCut = [];
      state.lockedCut = null;
      state.livePreview = { mode: "none", text: "Ready" };
      state.touchDrawStartPoint = null;
      state.touchDrawStartTime = 0;
      setStatus(state.touchStraightArmed ? "Straight-line mode armed: drag to cut." : "Ready");
      render();
      return;
    }

    const consumeStraightArm = evt.pointerType === "touch" && state.touchStraightArmed;
    if (!state.lockedCut) {
      const pt = getSvgPoint(evt, foldedSvg, state.foldedView);
      if (isStraightModeActive(evt)) {
        updateShiftConstrainedCut(pt);
      } else {
        addPointToCurrentCut(pt);
      }
    }
    foldedSvg.releasePointerCapture(evt.pointerId);
    finalizeCut();
    if (consumeStraightArm) state.touchStraightArmed = false;
    state.touchDrawStartPoint = null;
    state.touchDrawMoved = false;
    state.touchDrawStartTime = 0;
  }

  function onFoldedPointerCancel(evt) {
    clearTouchLongPressArm();
    if (evt.pointerType === "touch") {
      const tState = getTouchState(foldedSvg);
      tState.pointers.delete(evt.pointerId);
      if (tState.pointers.size < 2) {
        tState.pinchActive = false;
        tState.circleResizeActive = false;
        tState.startDistance = 0;
      }
    }

    const wasDrawing = state.drawing;
    state.drawing = false;
    if (state.panning) stopPanning();
    if (wasDrawing && (state.lockedCut || state.currentCut.length >= 2)) {
      finalizeCut();
      return;
    }
    state.currentCut = [];
    state.lockedCut = null;
    state.touchDrawStartPoint = null;
    state.touchDrawMoved = false;
    state.touchDrawStartTime = 0;
    state.livePreview = { mode: "none", text: "Ready" };
    setStatus("Cut cancelled.");
    render();
  }

  function onUnfoldedPointerDown(evt) {
    if (evt.pointerType === "touch") {
      evt.preventDefault();
      const tState = getTouchState(unfoldedSvg);
      unfoldedSvg.setPointerCapture(evt.pointerId);
      tState.pointers.set(evt.pointerId, getSvgPoint(evt, unfoldedSvg));
      if (tState.pointers.size >= 2) {
        startTouchPinch(unfoldedSvg, state.unfoldedView, tState);
        return;
      }
    }
    handleMiddlePanPointerDown(evt, unfoldedSvg, state.unfoldedView);
  }

  function onUnfoldedPointerMove(evt) {
    if (evt.pointerType === "touch") {
      const tState = getTouchState(unfoldedSvg);
      if (tState.pointers.has(evt.pointerId)) {
        tState.pointers.set(evt.pointerId, getSvgPoint(evt, unfoldedSvg));
      }
      if (tState.pinchActive || tState.pointers.size >= 2) {
        if (!tState.pinchActive && tState.pointers.size >= 2) {
          startTouchPinch(unfoldedSvg, state.unfoldedView, tState);
        }
        if (updateTouchPinch(unfoldedSvg, state.unfoldedView, tState)) return;
      }
    }
    handlePanPointerMove(evt, unfoldedSvg);
  }

  function onUnfoldedPointerUp(evt) {
    if (evt.pointerType === "touch") {
      const tState = getTouchState(unfoldedSvg);
      tState.pointers.delete(evt.pointerId);
      if (tState.pointers.size < 2) {
        tState.pinchActive = false;
        tState.circleResizeActive = false;
        tState.startDistance = 0;
      }
    }
    handlePanPointerUp(evt, unfoldedSvg);
  }

  function onUnfoldedPointerCancel(evt) {
    if (evt.pointerType === "touch") {
      const tState = getTouchState(unfoldedSvg);
      tState.pointers.delete(evt.pointerId);
      if (tState.pointers.size < 2) {
        tState.pinchActive = false;
        tState.startDistance = 0;
      }
    }
    if (state.panning) stopPanning();
  }

  function onUnfoldedClick() {
    toggleUnfoldedSpin();
  }

  function onFoldedWheel(evt) {
    if (!state.drawing && state.activeTool === TOOL_CIRCLE && evt.ctrlKey && !evt.metaKey) {
      evt.preventDefault();
      const direction = evt.deltaY < 0 ? 1 : -1;
      state.circleCutRadius = clamp(state.circleCutRadius + direction * 2, CIRCLE_RADIUS_MIN, CIRCLE_RADIUS_MAX);
      const hoverPt = state.circleHoverPoint || getSvgPoint(evt, foldedSvg, state.foldedView);
      updateCirclePreview(hoverPt);
      render();
      return;
    }
    handleWheelZoom(evt, foldedSvg, state.foldedView);
  }

  function onUnfoldedWheel(evt) {
    handleWheelZoom(evt, unfoldedSvg, state.unfoldedView);
  }

  function preventDefault(evt) {
    evt.preventDefault();
  }

  function onDocumentKeyDown(evt) {
    handleHistoryShortcut(evt);
  }

  function onDocumentKeyUp(evt) {
    if (evt.key === "Control" && state.circleHoverPoint && !state.drawing && state.activeTool !== TOOL_CIRCLE) {
      clearCirclePreview();
      render();
    }
  }

  function onWindowResize() {
    resizeBackgroundCanvas();
    ensureBackgroundFlakes();
  }

  // -------------------------------------------------------------------------
  // Wiring + lifecycle
  // -------------------------------------------------------------------------

  function addSvgListener(svg, type, handler, options = undefined) {
    svg.addEventListener(type, handler, options);
  }

  function wireEvents() {
    addSvgListener(foldedSvg, "pointerdown", onFoldedPointerDown);
    addSvgListener(foldedSvg, "pointermove", onFoldedPointerMove);
    addSvgListener(foldedSvg, "pointerup", onFoldedPointerUp);
    addSvgListener(foldedSvg, "pointercancel", onFoldedPointerCancel);
    addSvgListener(foldedSvg, "wheel", onFoldedWheel, { passive: false });
    addSvgListener(foldedSvg, "contextmenu", preventDefault);

    addSvgListener(unfoldedSvg, "click", onUnfoldedClick);
    addSvgListener(unfoldedSvg, "pointerdown", onUnfoldedPointerDown);
    addSvgListener(unfoldedSvg, "pointermove", onUnfoldedPointerMove);
    addSvgListener(unfoldedSvg, "pointerup", onUnfoldedPointerUp);
    addSvgListener(unfoldedSvg, "pointercancel", onUnfoldedPointerCancel);
    addSvgListener(unfoldedSvg, "wheel", onUnfoldedWheel, { passive: false });
    addSvgListener(unfoldedSvg, "contextmenu", preventDefault);

    for (const button of zoomResetTargets) {
      const handler = () => {
        if (button.getAttribute("data-zoom-reset-for") === "foldedCanvas") {
          resetZoom(foldedSvg, state.foldedView);
        } else if (button.getAttribute("data-zoom-reset-for") === "unfoldedCanvas") {
          resetZoom(unfoldedSvg, state.unfoldedView);
        }
      };
      button.addEventListener("click", handler);
      zoomResetListeners.push([button, handler]);
    }

    document.addEventListener("keydown", onDocumentKeyDown);
    documentListeners.push(["keydown", onDocumentKeyDown]);
    document.addEventListener("keyup", onDocumentKeyUp);
    documentListeners.push(["keyup", onDocumentKeyUp]);
    window.addEventListener("resize", onWindowResize);
    windowListeners.push(["resize", onWindowResize]);
  }

  function animationLoop(now) {
    const t = typeof now === "number" ? now : performance.now();
    const dt = clamp((t - state.lastFrameTime) / 1000, 0, 0.05);
    state.lastFrameTime = t;
    updateBackgroundFlakes(dt);
    render();
    rafId = requestAnimationFrame(animationLoop);
  }

  function init() {
    wireEvents();
    resizeBackgroundCanvas();
    ensureBackgroundFlakes();
    syncSpinState();
    state.lastFrameTime = performance.now();
    if (!tryRestoreActiveStudioState()) {
      resetPaper();
    }
    syncToolState();
    rafId = requestAnimationFrame(animationLoop);
  }

  function destroy() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    clearTouchLongPressArm();
    for (const [type, handler] of documentListeners) document.removeEventListener(type, handler);
    for (const [type, handler] of windowListeners) window.removeEventListener(type, handler);
    documentListeners.length = 0;
    windowListeners.length = 0;
    for (const [button, handler] of zoomResetListeners) button.removeEventListener("click", handler);
    zoomResetListeners.length = 0;
    if (foldedSvg.parentNode) foldedSvg.parentNode.removeChild(foldedSvg);
    if (unfoldedSvg.parentNode) unfoldedSvg.parentNode.removeChild(unfoldedSvg);
  }

  init();

  // Public API used by the React layer.
  return {
    destroy,
    reset: () => resetPaper(),
    startNewSnowflake: (options, status) => resetPaper(options, status),
    undo: undoLastCut,
    redo: redoLastCut,
    randomCut: applyRandomCut,
    exportSvg: exportSnowflakeSvg,
    saveToCollection: addCurrentSnowflakeToCollection,
    setOptions: setSnowflakeOptions,
    setActiveTool: (toolId) => setActiveTool(toolId, { announce: true }),
    toggleCircleResizeMode: () => setCircleResizeMode(!state.circleResizeMode),
    getActiveTool: () => state.activeTool,
    getOptions: () => normalizeSnowflakeOptions(state.options),
    hasChanges: hasSnowflakeChanges
  };
}

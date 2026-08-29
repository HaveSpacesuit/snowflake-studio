// Pure math for a pannable/zoomable canvas view. A view is
// `{ scale, offsetX, offsetY, rotation? }` mapping world coordinates to screen.

import { DISPLAY_HEIGHT, DISPLAY_WIDTH, MAX_VIEW_SCALE, MIN_VIEW_SCALE } from "../constants.ts";
import { clamp } from "../utils/math.ts";

export function resetView(view) {
  view.scale = 1;
  view.offsetX = 0;
  view.offsetY = 0;
}

/** Keep content centred when zoomed out, and prevent panning past the edges. */
export function clampViewToCanvas(view) {
  if (Math.abs(view.scale - 1) < 0.0001) {
    view.offsetX = 0;
    view.offsetY = 0;
    return;
  }

  if (view.scale < 1) {
    view.offsetX = (DISPLAY_WIDTH * (1 - view.scale)) / 2;
    view.offsetY = (DISPLAY_HEIGHT * (1 - view.scale)) / 2;
    return;
  }

  const minOffsetX = DISPLAY_WIDTH * (1 - view.scale);
  const minOffsetY = DISPLAY_HEIGHT * (1 - view.scale);
  view.offsetX = clamp(view.offsetX, minOffsetX, 0);
  view.offsetY = clamp(view.offsetY, minOffsetY, 0);
}

/**
 * Zoom around a focus point (in screen space) by a wheel delta, keeping the
 * point under the cursor fixed. Returns true if the scale actually changed.
 */
export function zoomViewAtPoint(view, focusX, focusY, deltaY) {
  const zoomFactor = Math.exp(-deltaY * 0.0015);
  const currentScale = view.scale;
  const nextScale = clamp(currentScale * zoomFactor, MIN_VIEW_SCALE, MAX_VIEW_SCALE);
  if (nextScale === currentScale) return false;

  const worldX = (focusX - view.offsetX) / currentScale;
  const worldY = (focusY - view.offsetY) / currentScale;
  view.scale = nextScale;
  view.offsetX = focusX - worldX * nextScale;
  view.offsetY = focusY - worldY * nextScale;
  clampViewToCanvas(view);
  return true;
}

// Normalisation for snowflake options (colours, widths, side count, preview
// mode). Everything that reads or writes options funnels through
// `normalizeSnowflakeOptions` so invalid/legacy values are always repaired.

import {
  DEFAULT_OUTLINE_EXTERIOR_COLOR,
  DEFAULT_OUTLINE_EXTERIOR_WIDTH,
  DEFAULT_OUTLINE_INTERIOR_WIDTH,
  DEFAULT_PREVIEW_MODE,
  DEFAULT_SIDE_COUNT,
  DEFAULT_SNOWFLAKE_COLOR,
  OUTLINE_WIDTH_MAX,
  OUTLINE_WIDTH_MIN,
  SIDE_COUNT_MAX,
  SIDE_COUNT_MIN
} from "../constants.ts";
import { clamp } from "../utils/math.ts";

export function normalizeOutlineColor(value) {
  if (typeof value !== "string") return DEFAULT_OUTLINE_EXTERIOR_COLOR;
  const candidate = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(candidate) ? candidate.toLowerCase() : DEFAULT_OUTLINE_EXTERIOR_COLOR;
}

export function normalizePreviewMode(value) {
  return value === "outline" || value === "body" || value === "outline-and-body"
    ? value
    : DEFAULT_PREVIEW_MODE;
}

/** Map a preview mode onto the 0/1/2 position of the Options slider. */
export function previewModeToSliderValue(mode) {
  switch (normalizePreviewMode(mode)) {
    case "outline":
      return "0";
    case "body":
      return "2";
    default:
      return "1";
  }
}

export function sliderValueToPreviewMode(value) {
  const numeric = Number(value);
  if (numeric <= 0) return "outline";
  if (numeric >= 2) return "body";
  return "outline-and-body";
}

export function normalizeSideCount(value, fallback = DEFAULT_SIDE_COUNT) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const rounded = Math.round(numeric);
  return clamp(rounded, SIDE_COUNT_MIN, SIDE_COUNT_MAX);
}

export function normalizeOutlineWidth(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return clamp(Math.round(numeric * 10) / 10, OUTLINE_WIDTH_MIN, OUTLINE_WIDTH_MAX);
}

/**
 * Return a fully-populated, validated options object. Accepts partial input,
 * `null`, or the legacy single `outlineColor` field.
 */
export function normalizeSnowflakeOptions(value) {
  const source = value && typeof value === "object" ? value : {};
  const legacyOutlineColor = source.outlineColor;

  const outlineExteriorColor = source.outlineExteriorColor !== undefined
    ? normalizeOutlineColor(source.outlineExteriorColor)
    : normalizeOutlineColor(legacyOutlineColor);

  const outlineInteriorColor = source.outlineInteriorColor !== undefined
    ? normalizeOutlineColor(source.outlineInteriorColor)
    : normalizeOutlineColor(legacyOutlineColor);

  return {
    outlineExteriorColor,
    outlineInteriorColor,
    outlineExteriorWidth: normalizeOutlineWidth(source.outlineExteriorWidth, DEFAULT_OUTLINE_EXTERIOR_WIDTH),
    outlineInteriorWidth: normalizeOutlineWidth(source.outlineInteriorWidth, DEFAULT_OUTLINE_INTERIOR_WIDTH),
    snowflakeColor: source.snowflakeColor !== undefined
      ? normalizeOutlineColor(source.snowflakeColor)
      : DEFAULT_SNOWFLAKE_COLOR,
    sideCount: normalizeSideCount(source.sideCount, DEFAULT_SIDE_COUNT),
    previewMode: normalizePreviewMode(source.previewMode)
  };
}

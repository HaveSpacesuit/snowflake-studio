// localStorage persistence for both the saved collection and the in-progress
// "active" Studio snowflake. Every read is defensive: corrupt or missing data
// resolves to sensible empty values rather than throwing.

import {
  ACTIVE_STUDIO_STORAGE_KEY,
  COLLECTION_MAX_ITEMS,
  COLLECTION_STORAGE_KEY,
  STORAGE_SCHEMA_VERSION
} from "../constants.js";
import { cloneGeom, normalizeGeom } from "../geometry/polygon.js";
import { normalizeSnowflakeOptions } from "./options.js";
import { computeSnowflakeSignature, getBasePaperSignature } from "./signature.js";

// ---------------------------------------------------------------------------
// Geometry restoration helpers
// ---------------------------------------------------------------------------

export function normalizeStoredGeom(value) {
  if (!Array.isArray(value)) return null;
  const normalized = normalizeGeom(value);
  return normalized.length > 0 ? normalized : null;
}

export function normalizeStoredGeomStack(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const entry of value) {
    const normalized = normalizeStoredGeom(entry);
    if (normalized) out.push(normalized);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Collection (saved snowflakes)
// ---------------------------------------------------------------------------

export function loadCollectionItems() {
  try {
    const raw = window.localStorage.getItem(COLLECTION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === "string" && typeof item.svg === "string");
  } catch (_) {
    return [];
  }
}

export function saveCollectionItems(items) {
  try {
    window.localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch (_) {
    return false;
  }
}

/** Prepend a new snowflake to the collection, capped at COLLECTION_MAX_ITEMS. */
export function saveSnowflakeToCollection({ svg, paperGeom, options }) {
  if (!svg) return false;
  const items = loadCollectionItems();
  const next = [
    {
      id: String(Date.now()),
      schemaVersion: STORAGE_SCHEMA_VERSION,
      svg,
      createdAt: Date.now(),
      paperGeom: cloneGeom(paperGeom),
      options: normalizeSnowflakeOptions(options)
    }
  ]
    .concat(items)
    .slice(0, COLLECTION_MAX_ITEMS);
  return saveCollectionItems(next);
}

// ---------------------------------------------------------------------------
// Active Studio snowflake (work in progress)
// ---------------------------------------------------------------------------

export function loadActiveStudioState() {
  try {
    const raw = window.localStorage.getItem(ACTIVE_STUDIO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_) {
    return null;
  }
}

export function removeActiveStudioState() {
  try {
    window.localStorage.removeItem(ACTIVE_STUDIO_STORAGE_KEY);
  } catch (_) {
    // ignore
  }
}

/**
 * Persist the active Studio state, or clear it when the snowflake matches the
 * pristine default (nothing worth restoring).
 */
export function persistActiveStudioState(payload, signature) {
  try {
    if (signature === getBasePaperSignature()) {
      removeActiveStudioState();
      return;
    }
    window.localStorage.setItem(
      ACTIVE_STUDIO_STORAGE_KEY,
      JSON.stringify({ schemaVersion: STORAGE_SCHEMA_VERSION, ...payload })
    );
  } catch (_) {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

/** True if the stored Studio snowflake differs from the pristine default. */
export function isNonEmptyStudioStatePresent() {
  const parsed = loadActiveStudioState();
  if (!parsed) return false;
  const paperGeom = normalizeStoredGeom(parsed.paperGeom);
  if (!paperGeom) return false;
  const signature = computeSnowflakeSignature(paperGeom, normalizeSnowflakeOptions(parsed.options));
  return signature !== getBasePaperSignature();
}

/** Store a snowflake as the active Studio design (used by the collection's Edit). */
export function saveAsActiveStudioSnowflake(paperGeom, options) {
  try {
    const normalized = normalizeGeom(paperGeom);
    if (normalized.length === 0) return false;
    const normalizedOptions = normalizeSnowflakeOptions(options);
    const signature = computeSnowflakeSignature(normalized, normalizedOptions);
    window.localStorage.setItem(
      ACTIVE_STUDIO_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: STORAGE_SCHEMA_VERSION,
        paperGeom: normalized,
        undoStack: [],
        redoStack: [],
        lastCollectionSavedSignature: signature,
        options: normalizedOptions
      })
    );
    return true;
  } catch (_) {
    return false;
  }
}

export function getActiveStudioPreviewSvg() {
  const parsed = loadActiveStudioState();
  return parsed && typeof parsed.previewSvg === "string" ? parsed.previewSvg : "";
}

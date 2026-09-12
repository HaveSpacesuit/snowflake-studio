// Build and parse the JSON "save file" used to share a single snowflake
// between users via the Collection page's Share/Import buttons. The format
// is intentionally independent of the localStorage collection schema so the
// two can evolve separately.

import { SHARE_FILE_SCHEMA_VERSION, SHARE_FILE_TYPE } from "../constants.ts";
import { cloneGeom } from "../geometry/polygon.ts";
import { buildUnfoldedGeom } from "../geometry/unfold.ts";
import { buildPrintPreviewSvgString } from "../print/previewSvg.ts";
import { normalizeSnowflakeOptions } from "./options.ts";
import { normalizeStoredGeom } from "./storage.ts";

function makeShareFilename() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `snowflake-${stamp}.snowflake.json`;
}

/** Serialize a collection item into a portable, human-diffable share file string. */
export function buildSnowflakeShareFileText(item) {
  const payload = {
    type: SHARE_FILE_TYPE,
    schemaVersion: SHARE_FILE_SCHEMA_VERSION,
    exportedAt: Date.now(),
    paperGeom: cloneGeom(item.paperGeom),
    options: normalizeSnowflakeOptions(item.options),
    previewSvg: typeof item.previewSvg === "string" ? item.previewSvg : ""
  };
  return JSON.stringify(payload, null, 2);
}

/** Trigger a browser download of the given item as a `.snowflake.json` file. */
export function downloadSnowflakeShareFile(item) {
  const text = buildSnowflakeShareFileText(item);
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = makeShareFilename();
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Parse and validate share-file JSON text. Returns a normalized
 * `{ paperGeom, options, previewSvg }` object, or `null` if the text is not a
 * recognizable/valid snowflake share file.
 */
export function parseSnowflakeShareFileText(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (_) {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || parsed.type !== SHARE_FILE_TYPE) return null;

  const paperGeom = normalizeStoredGeom(parsed.paperGeom);
  if (!paperGeom) return null;

  const options = normalizeSnowflakeOptions(parsed.options);
  const previewSvg = typeof parsed.previewSvg === "string" && parsed.previewSvg.trim()
    ? parsed.previewSvg
    : regeneratePreviewSvg(paperGeom, options);
  return { paperGeom, options, previewSvg };
}

/** Rebuild a preview SVG for share files that omit or lose their stored preview. */
function regeneratePreviewSvg(paperGeom, options) {
  const unfoldedGeom = buildUnfoldedGeom(paperGeom, options.sideCount, [], () => {});
  return buildPrintPreviewSvgString(unfoldedGeom, options, Math.PI / 6);
}

// Builds the SVG scene graph for the two Studio panels. The DOM structure and
// data-* attributes here are the contract the engine (and the e2e tests) rely
// on, so each named node is created up front and looked up by `data-role`.

import { CANVAS_BG, DISPLAY_HEIGHT, DISPLAY_WIDTH, FOLDED_BASE_ROTATION } from "../constants.ts";

export const SVG_NS = "http://www.w3.org/2000/svg";

export function createSvgElement(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, String(value));
  }
  return el;
}

/**
 * Create a panel `<svg>` (id `foldedCanvas` or `unfoldedCanvas`) with its
 * background, zoom/pan viewport, and role-specific content layers.
 */
export function buildPanelSvg(id, label) {
  const svg = createSvgElement("svg", {
    id,
    class: "panelSvg",
    width: String(DISPLAY_WIDTH),
    height: String(DISPLAY_HEIGHT),
    viewBox: `0 0 ${DISPLAY_WIDTH} ${DISPLAY_HEIGHT}`,
    draggable: "false",
    role: "img",
    "aria-label": label,
    "data-panel-canvas": id,
    "data-zoom-scale": "1.0000",
    "data-zoom-offset-x": "0.00",
    "data-zoom-offset-y": "0.00",
    ...(id === "foldedCanvas" ? { "data-folded-rotation": String(FOLDED_BASE_ROTATION) } : {}),
    "data-spin-paused": "false",
    "aria-pressed": "false"
  });

  const bg = createSvgElement("rect", {
    "data-role": "bg",
    x: "0",
    y: "0",
    width: String(DISPLAY_WIDTH),
    height: String(DISPLAY_HEIGHT),
    fill: CANVAS_BG
  });

  const viewport = createSvgElement("g", { "data-layer": "viewport" });
  const content = createSvgElement("g", { "data-layer": "content" });

  svg.appendChild(bg);

  if (id === "foldedCanvas") {
    content.appendChild(buildFoldedContent());
  } else {
    content.appendChild(buildUnfoldedContent());
  }

  viewport.appendChild(content);
  svg.appendChild(viewport);
  return svg;
}

function buildFoldedContent() {
  const paperScene = createSvgElement("g", { "data-role": "paper-scene" });
  const paper = createSvgElement("path", {
    "data-role": "paper-shape",
    fill: "#ffffff",
    stroke: "none",
    "fill-rule": "evenodd"
  });
  const border = createSvgElement("path", {
    "data-role": "paper-border",
    fill: "none",
    stroke: "#8fa5cf",
    "stroke-width": "2",
    "stroke-linejoin": "round"
  });
  const fallingCuts = createSvgElement("g", {
    "data-role": "falling-cuts",
    "pointer-events": "none"
  });
  const liveCut = createSvgElement("path", {
    "data-role": "live-cut",
    fill: "none",
    stroke: "#ff7ca8",
    "stroke-width": "2.4",
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  });
  paperScene.appendChild(paper);
  paperScene.appendChild(border);
  paperScene.appendChild(fallingCuts);
  paperScene.appendChild(liveCut);
  return paperScene;
}

function buildUnfoldedContent() {
  const spin = createSvgElement("g", { "data-role": "spin-layer" });
  const paper = createSvgElement("path", {
    "data-role": "snowflake-shape",
    fill: "#ffffff",
    stroke: "none",
    "fill-rule": "evenodd"
  });
  const outlineOuter = createSvgElement("path", {
    "data-role": "snowflake-outline-outer",
    fill: "none",
    stroke: "#65b7ff",
    "stroke-width": "3.2",
    "stroke-linejoin": "round",
    "stroke-linecap": "round",
    "vector-effect": "non-scaling-stroke"
  });
  const outlineHoles = createSvgElement("path", {
    "data-role": "snowflake-outline-holes",
    fill: "none",
    stroke: "#65b7ff",
    "stroke-width": "1.8",
    "stroke-linejoin": "round",
    "stroke-linecap": "round",
    "vector-effect": "non-scaling-stroke"
  });
  spin.appendChild(paper);
  spin.appendChild(outlineOuter);
  spin.appendChild(outlineHoles);
  return spin;
}

/** Look up the folded panel's content layers by role. */
export function extractFoldedLayer(svg) {
  return {
    viewport: svg.querySelector("[data-layer='viewport']"),
    bg: svg.querySelector("[data-role='bg']"),
    paperScene: svg.querySelector("[data-role='paper-scene']"),
    paper: svg.querySelector("[data-role='paper-shape']"),
    border: svg.querySelector("[data-role='paper-border']"),
    fallingCuts: svg.querySelector("[data-role='falling-cuts']"),
    liveCut: svg.querySelector("[data-role='live-cut']")
  };
}

/** Look up the unfolded panel's content layers by role. */
export function extractUnfoldedLayer(svg) {
  return {
    viewport: svg.querySelector("[data-layer='viewport']"),
    bg: svg.querySelector("[data-role='bg']"),
    spin: svg.querySelector("[data-role='spin-layer']"),
    paper: svg.querySelector("[data-role='snowflake-shape']"),
    outlineOuter: svg.querySelector("[data-role='snowflake-outline-outer']"),
    outlineHoles: svg.querySelector("[data-role='snowflake-outline-holes']")
  };
}

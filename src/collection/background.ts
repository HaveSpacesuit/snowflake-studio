// Framework-agnostic ambient snowfall for the Collection page. Renders saved
// snowflake SVGs (or a fallback) as gently tumbling images on a full-screen
// canvas. Created once, fed the current collection via `setItems`, and torn
// down with `destroy`.

import {
  BG_FLAKE_COUNT,
  BG_FLAKE_MAX_SIZE,
  BG_FLAKE_MIN_SIZE,
  DISPLAY_HEIGHT,
  DISPLAY_WIDTH
} from "../constants.ts";
import { clamp, rand } from "../utils/math.ts";
import { getActiveStudioPreviewSvg } from "../snowflake/storage.ts";

const DEFAULT_FALLBACK_SVG = [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 520" width="520" height="520">`,
  `  <g transform="translate(260 260)">`,
  `    <path d="M 0 -170 L 22 -64 L 116 -126 L 64 -22 L 170 0 L 64 22 L 116 126 L 22 64 L 0 170 L -22 64 L -116 126 L -64 22 L -170 0 L -64 -22 L -116 -126 L -22 -64 Z" fill="#ffffff" fill-rule="evenodd" stroke="none"/>`,
  `    <path d="M 0 -170 L 22 -64 L 116 -126 L 64 -22 L 170 0 L 64 22 L 116 126 L 22 64 L 0 170 L -22 64 L -116 126 L -64 22 L -170 0 L -64 -22 L -116 -126 L -22 -64 Z" fill="none" stroke="#65b7ff" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>`,
  `  </g>`,
  `</svg>`
].join("\n");

export function createCollectionBackground(canvas) {
  const ctx = canvas ? canvas.getContext("2d") : null;
  if (!ctx) {
    return { setItems() {}, destroy() {} };
  }
  ctx.imageSmoothingEnabled = true;

  const state = {
    templates: [],
    flakes: [],
    sourceKey: "",
    lastFrameTime: performance.now(),
    rafId: 0
  };

  function getBackgroundSvgSources(items) {
    const saved = items
      .map((item) => (typeof item.svg === "string" ? item.svg.trim() : ""))
      .filter((svg) => svg.length > 0);
    if (saved.length > 0) {
      return { key: "saved:" + items.map((item) => item.id).join("|"), svgs: saved };
    }

    const activePreview = getActiveStudioPreviewSvg().trim();
    if (activePreview.length > 0) {
      return { key: "active:" + activePreview.length, svgs: [activePreview] };
    }

    return { key: "fallback:default", svgs: [DEFAULT_FALLBACK_SVG] };
  }

  function disposeTemplates() {
    for (const template of state.templates) {
      if (template.url) {
        try {
          URL.revokeObjectURL(template.url);
        } catch (_) {
          // ignore
        }
      }
    }
    state.templates = [];
  }

  function createTemplate(svgText) {
    const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    const template = { img, url, ready: false, width: DISPLAY_WIDTH, height: DISPLAY_HEIGHT };

    img.addEventListener("load", () => {
      template.ready = true;
      template.width = img.naturalWidth || DISPLAY_WIDTH;
      template.height = img.naturalHeight || DISPLAY_HEIGHT;
    });
    img.addEventListener("error", () => {
      template.ready = false;
    });
    img.src = url;
    return template;
  }

  function createFlake(initial) {
    const w = canvas.width;
    const h = canvas.height;
    const size = rand(BG_FLAKE_MIN_SIZE, BG_FLAKE_MAX_SIZE);
    const margin = size * 1.4;
    return {
      templateIndex: state.templates.length > 0 ? Math.floor(rand(0, state.templates.length)) : 0,
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

  function ensureFlakes() {
    if (state.flakes.length === BG_FLAKE_COUNT) return;
    state.flakes = [];
    for (let i = 0; i < BG_FLAKE_COUNT; i += 1) {
      state.flakes.push(createFlake(true));
    }
  }

  function refreshTemplates(items) {
    const source = getBackgroundSvgSources(items);
    if (source.key === state.sourceKey) return;

    state.sourceKey = source.key;
    disposeTemplates();
    const uniqueSvgs = Array.from(new Set(source.svgs)).slice(0, 40);
    state.templates = uniqueSvgs.map((svg) => createTemplate(svg));
    state.flakes = [];
    ensureFlakes();
  }

  function resizeCanvas() {
    const w = Math.max(1, Math.floor(window.innerWidth));
    const h = Math.max(1, Math.floor(window.innerHeight));
    const changed = canvas.width !== w || canvas.height !== h;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    return changed;
  }

  function updateFlakes(dt) {
    const w = canvas.width;
    const h = canvas.height;
    for (let i = 0; i < state.flakes.length; i += 1) {
      const flake = state.flakes[i];
      flake.y += flake.speed * dt;
      flake.driftPhase += flake.driftFreq * dt;
      flake.rotation += flake.spin * dt;
      flake.flipPhase += flake.flipSpeed * dt;
      flake.baseX += flake.meander * dt * 0.2;
      const margin = flake.size * 2;
      if (flake.y - margin > h) {
        state.flakes[i] = createFlake(false);
        continue;
      }
      if (flake.baseX < -margin) flake.baseX = w + margin;
      else if (flake.baseX > w + margin) flake.baseX = -margin;
    }
  }

  function drawFlakes() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const readyTemplates = state.templates.filter((template) => template.ready);
    if (readyTemplates.length === 0) return;

    for (const flake of state.flakes) {
      const flutterX =
        Math.sin(flake.driftPhase) * flake.driftAmp +
        Math.sin(flake.driftPhase * 2.7) * flake.driftAmp * 0.28;
      const x = flake.baseX + flutterX;
      const flipWave = Math.sin(flake.flipPhase);
      const flipAbs = Math.abs(flipWave);
      const squashA = 0.26 + flipAbs * 0.74;
      const squashB = 0.58 + (1 - flipAbs) * 0.42;
      const axisBlend = flake.flipAxis;
      const sx = axisBlend < 0.5 ? squashA * Math.sign(flipWave || 1) : squashB;
      const sy = axisBlend > 0.5 ? squashA : squashB;
      const template = readyTemplates[flake.templateIndex % readyTemplates.length];
      const baseSize = Math.max(1, Math.max(template.width, template.height));
      const scale = flake.size / baseSize;

      ctx.save();
      ctx.globalAlpha = flake.alpha;
      ctx.translate(x, flake.y);
      ctx.rotate(flake.rotation);
      ctx.scale(scale * sx, scale * sy);
      ctx.drawImage(template.img, -template.width / 2, -template.height / 2, template.width, template.height);
      ctx.restore();
    }
  }

  function animate(now) {
    const t = typeof now === "number" ? now : performance.now();
    const dt = clamp((t - state.lastFrameTime) / 1000, 0, 0.05);
    state.lastFrameTime = t;
    updateFlakes(dt);
    drawFlakes();
    state.rafId = requestAnimationFrame(animate);
  }

  const handleResize = () => {
    if (resizeCanvas()) state.flakes = [];
    ensureFlakes();
  };

  resizeCanvas();
  ensureFlakes();
  state.lastFrameTime = performance.now();
  state.rafId = requestAnimationFrame(animate);
  window.addEventListener("resize", handleResize);

  return {
    setItems(items) {
      refreshTemplates(Array.isArray(items) ? items : []);
    },
    destroy() {
      cancelAnimationFrame(state.rafId);
      window.removeEventListener("resize", handleResize);
      disposeTemplates();
      state.flakes = [];
    }
  };
}

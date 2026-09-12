# Snowflake Studio

Snowflake Studio is a client-side React 19 and Vite application for designing
paper snowflakes. Draw cuts on a folded triangular wedge and see the fully
unfolded result immediately. The app has no server or account system: designs
and the in-progress editor are stored in the browser's local storage.

## What the app provides

- Freehand, straight, circle, and generated random cuts.
- Live folded-paper editing and an animated unfolded Preview.
- Independent zoom for Edit and Preview; desktop middle-click dragging pans a
  zoomed panel.
- Undo/redo controls and keyboard shortcuts:
  `Ctrl+Z`/`Ctrl+Y` on Windows and Linux, or
  `Command+Z`/`Command+Shift+Z` on macOS.
- Preview representation options (outline, body, or both), body/outline
  colors, outline thickness, and four- through ten-sided snowflakes.
- A local Collection page for reopening, deleting, sharing, importing, and
  printing saved designs.
- Printable cutting instructions for six-sided snowflakes, either through the
  browser print dialog or as a PDF download.

## User workflow

### Draw and preview

The **Edit** panel shows the folded paper. The **Preview** panel shows the
unfolded snowflake and spins until it is clicked or tapped.

Freehand and straight cuts must cross the folded paper from an edge to an
edge. Start and finish just outside the paper; a start point close to an edge
is snapped to it. Returning through the same edge is allowed, but an
interior-only stroke is rejected. Circle cuts must be inside the paper or
overlap it to remove material.

On desktop, `Shift` while drawing makes a straight stroke. In Circle mode,
`Ctrl+wheel` (or `Command+wheel` on macOS) changes the radius and clicking
applies the cut. Holding `Ctrl`/`Command` temporarily uses Circle mode.
On touch devices, long-press Edit to arm a one-time straight cut. Select
**Resize circle** to use pinch for circle radius; turn it off to use pinch
for zoom.

Wheel or pinch zooms each panel. Desktop middle-click drag pans a zoomed
panel. **New** clears changed work after confirmation, and **Random cut**
generates a valid exploratory cut.

### Options and printing

**Options** applies appearance changes live while the dialog is open. Cancel
restores the values captured when the dialog opened. Changing side count from
4 through 10 changes the folded base geometry; saving that change starts a
new snowflake and discards the current cuts. Print paper size can be Letter or
A4.

Print actions are enabled only for six-sided snowflakes. **Print instructions**
opens the browser's print dialog, while **Save instructions** downloads the
same instruction sheet as a PDF.

### Collection and sharing

**Save to collection** stores a design locally. Collection stores up to 120
designs, newest first. Each saved design can be loaded into Studio, deleted,
or exported with **Share**. Share exports a portable `.snowflake.json` file;
use **Import** on the Collection page to add that file to another browser.
Loading a collection item replaces in-progress Studio work only after
confirmation. **Clear all** removes every saved collection item after
confirmation.

The active Studio design is persisted separately so a browser refresh or
return to Studio can restore work in progress. Clearing a design removes that
active state. Clearing site data, using a different browser/profile, or
private browsing can remove or limit these locally stored designs.

## Project layout

- `index.html` and `src/main.tsx` — Studio entry point.
- `collection.html` and `src/collection-main.tsx` — Collection entry point.
- `src/components/` — React UI, dialogs, navigation, collection tiles, and
  print layout.
- `src/studio/` — imperative SVG editor engine and input/rendering lifecycle.
- `src/geometry/` — polygon normalization, cut validation, unfolding, view
  transforms, and random-cut generation.
- `src/snowflake/` — option normalization, local persistence, signatures, and
  portable share-file parsing.
- `src/print/` — print preview generation and PDF export.
- `tests/` — Playwright end-to-end tests.

The editor deliberately keeps geometry and pointer/touch handling outside
React. React owns page-level state such as dialogs, status messages, and
collection items; `useStudioEngine` bridges those values to the imperative
engine.

## Development

Prerequisites are Node.js 22 (the CI version; a current Node.js LTS release
should also work) and pnpm 11. The repository declares pnpm in
`package.json` and includes a lockfile, so use pnpm for reproducible installs.

```text
pnpm install
pnpm run dev
pnpm run typecheck
pnpm run build
pnpm run preview
pnpm test
```

`pnpm run dev` starts Vite with hot reload. The default development URLs are
`/index.html` for Studio and `/collection.html` for Collection. `typecheck`
runs TypeScript without emitting files, `build` writes both pages to `dist/`,
and `test` runs the Playwright suite with its configured Vite web server.
`preview` serves the production build locally.

## Deployment

`.github/workflows/deploy.yml` deploys to GitHub Pages on pushes to `main` and
on manual workflow dispatch. The workflow:

1. Installs Node 22 and pnpm.
2. Runs `pnpm install --frozen-lockfile`.
3. Runs `pnpm run typecheck` and `pnpm run build`.
4. Copies `dist/collection.html` to `dist/collection/index.html` so
   `/collection/` is a friendly route.
5. Publishes `dist/` with the GitHub Pages deployment action.

In repository settings, select **Pages > Build and deployment > Source >
GitHub Actions**. A manual deployment can then be started from the
**Deploy to GitHub Pages** workflow.

## Reporting issues

Use the **Submit bug report** link in the Studio help dialog to open a GitHub
issue. Include the browser/OS, page (Studio or Collection), reproduction
steps, and whether the problem affects drawing, persistence, sharing, or
printing.

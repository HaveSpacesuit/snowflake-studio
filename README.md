# Snowflake Studio

Snowflake Studio is a React 19 and Vite app for cutting a folded paper wedge and previewing the unfolded snowflake. It includes a local saved-design collection and SVG export.

## Features

- Freehand, straight, and circle cuts, plus a valid random cut for the selected tool.
- Live folded-paper editing and a rotating unfolded preview.
- Independent zoom on both panels; desktop users can pan a zoomed panel with middle-click drag.
- Undo and redo controls, with `Ctrl + Z` / `Ctrl + Y` on Windows and Linux, and `Command + Z` / `Command + Shift + Z` on macOS.
- Appearance and side-count options, SVG export, and locally persisted work in progress.
- A local Collection page for reopening or deleting saved snowflakes.

## Using the Studio

Freehand and straight cuts must travel from outside the current folded paper, through it, and back outside. Starting close to an edge snaps the start point to the edge. A cut may enter and leave through the same edge, but an interior-only freehand or straight cut is rejected.

Use the Straight tool, or hold `Shift` while drawing on desktop, for a straight cut. On touch devices, long-press to arm a one-time straight cut. Select the Circle tool and click or tap to make a circle cut; it must be fully inside the folded paper or overlap its edge. On desktop, `Ctrl + wheel` adjusts its radius, or `Command + wheel` on macOS. Holding `Ctrl`, or `Command` on macOS, temporarily activates the Circle tool without switching tools. On touch devices, select **Resize circle** and pinch to resize; toggle it off to return pinch to zoom.

Wheel or pinch zooms each panel. A zoomed desktop panel can be panned with middle-click drag. Click or tap the Preview panel to pause or resume its rotation. **New** clears the current snowflake after confirmation when it has changes.

Use **Save to collection** to store the current design in browser local storage. The Collection page lets you load a saved design back into Studio or delete it. Saving a Collection design to Studio replaces any in-progress Studio design after confirmation. The collection holds up to 120 designs.

**Options** changes preview mode, body color, interior and exterior outline colors and thicknesses, and side count from 4 through 10. Appearance changes apply live and can be cancelled; saving a side-count change starts a new snowflake and discards the current cuts.

## Development

Prerequisites: a current Node.js LTS release and npm.

- `npm install` installs dependencies.
- `npm run dev` starts the Vite development server with hot reloading.
- `npm run build` builds the Studio and Collection pages into `dist/`.
- `npm run preview` serves the production build locally.
- `npm run typecheck` runs TypeScript without emitting files.
- `npm test` runs the Playwright end-to-end suite and starts the development server automatically.

## Deployment

The included `netlify.toml` configures Netlify with:

- Build command: `npm run build`
- Publish directory: `dist`
- `/collection` served by `collection.html`

To deploy, push the repository to a Git provider, import it into Netlify, and deploy. Netlify reads the included configuration automatically.

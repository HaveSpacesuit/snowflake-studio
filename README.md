# Snowflake Studio

A React 19 + Vite app for cutting folded paper snowflakes and saving them to a collection.

## Develop

- `npm install` — install dependencies.
- `npm run dev` — start the Vite dev server with hot reloading.
- `npm run build` — build the Studio and Collection pages into `dist/`.
- `npm run preview` — preview the production build locally.
- `npm test` — run the Playwright end-to-end suite (starts the dev server automatically).

## Deploy (Netlify)

This repo includes `netlify.toml` and is ready for Netlify:

- Build command: `npm run build`
- Publish directory: `dist`

Path behavior configured:

- `/collection` serves `collection.html`

Quick setup:

1. Push this repo to GitHub.
2. In Netlify, choose "Add new site" -> "Import an existing project".
3. Select the repo and deploy (Netlify will read `netlify.toml`).

## Rules Implemented

A cut is valid if either:

1. The cut starts and ends on the edge of the current folded paper.
2. The cut is an explicit closed loop, self-intersects, and stays inside the folded paper.

After a valid cut:

- The cut path is removed from the folded paper.
- Remaining paper is split into connected regions.
- Only the single largest region remains.
- The unfolded snowflake preview is redrawn using mirrored and rotated copies.

## Quick Manual Checks

1. Draw a line from one paper edge to another. It should be accepted.
2. Draw a random open line entirely inside. It should be rejected.
3. Draw a closed loop that self-intersects inside. It should be accepted.
4. Press Reset and verify the original folded triangle returns.

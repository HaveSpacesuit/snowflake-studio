# Snowflake Studio Manual QA Checklist

This checklist covers the Studio editor, Collection page, local persistence,
sharing, printing, responsive behavior, accessibility, and failure handling.
Record the browser/OS, viewport, test data, and result for every failed item.

## 1. Test setup and baseline

- [ ] Run the app from a production-like build (`pnpm run build` followed by
  `pnpm run preview`) and from the development server.
- [ ] Test in the current versions of Chrome, Edge, Firefox, and Safari where
  available.
- [ ] Test on Windows and macOS desktop; test at least one iOS or Android
  touch device or an equivalent touch-capable browser.
- [ ] Test at the supported desktop viewport (1200 x 900), a narrow desktop
  viewport, a tablet viewport, and a phone viewport in portrait and landscape.
- [ ] Start with a clean browser profile or clear site data. Confirm that
  `index.html` opens Studio and `collection.html` opens Collection.
- [ ] Confirm the page loads without a blank screen, uncaught console errors,
  broken icon assets, missing styles, or failed network requests.
- [ ] Confirm the background animation renders without obscuring controls or
  capturing pointer input.
- [ ] Confirm the page title, headings, navigation labels, panel titles, and
  status area are present and readable.
- [ ] Confirm the initial Edit panel contains a folded triangular wedge and the
  Preview panel contains a six-sided snowflake.
- [ ] Confirm the initial tool is Freehand, Undo/Redo are disabled, Save to
  collection is disabled, and both print actions are enabled.
- [ ] Confirm the Preview animation spins automatically and clicking/tapping
  the Preview panel pauses and resumes it.

## 2. Navigation and page lifecycle

- [ ] Select **Studio** from either page and verify navigation to Studio.
- [ ] Select **Collection** from either page and verify navigation to Collection.
- [ ] Verify the active page has `aria-current="page"` and the inactive page
  does not.
- [ ] Use browser Back and Forward between Studio and Collection and verify
  each page initializes correctly.
- [ ] Reload Studio with a pristine design and verify it remains pristine.
- [ ] Reload Collection when empty and verify the empty-state message is shown.
- [ ] Open each page directly by URL, including a trailing-slash Collection
  route when deployed.
- [ ] Use browser zoom at 80%, 100%, 125%, 200%, and the highest practical
  level. Verify no critical control or dialog content is inaccessible.
- [ ] Resize the window while the app is open. Verify panels, toolbars, dialogs,
  and background canvas recover without overlap or stale positioning.
- [ ] Verify navigating away while a dialog is open does not leave a stuck
  modal or scroll lock on return.

## 3. Help dialog

- [ ] Open **How to use** from Studio.
- [ ] Verify the dialog title, desktop controls, touch controls, valid-cut
  guidance, preview/appearance guidance, and save/share/print guidance are
  complete and legible.
- [ ] Verify desktop and touch guidance is displayed appropriately for the
  input environment and does not hide relevant instructions.
- [ ] Close with the **Close** button.
- [ ] Close by clicking the backdrop.
- [ ] Close with Escape.
- [ ] Reopen after closing and verify it starts in the same clean state.
- [ ] Tab through the dialog and verify focus remains usable and visible.
- [ ] Activate **Submit bug report** and verify it opens the expected GitHub
  issue URL in a new tab/window without navigating the app away.

## 4. Edit tool rail and toolbar

- [ ] Verify every tool has a visible icon, an accessible name, and a tooltip
  on hover/focus: Freehand, Straight, Circle, and Random cut.
- [ ] Verify the selected tool has the correct active/pressed state.
- [ ] Select Freehand, Straight, and Circle and verify only the selected tool
  is active.
- [ ] Verify the Resize circle control appears only in Circle mode.
- [ ] Verify selecting another tool hides Resize circle and restores the
  normal pinch/zoom behavior.
- [ ] Click **New** with no changes and verify it resets immediately without a
  confirmation dialog.
- [ ] Make a cut, click **New**, and verify the confirmation dialog explains
  that cuts will be cleared and cannot be undone.
- [ ] Cancel the New dialog with **Keep editing**, backdrop click, and Escape;
  verify the cut remains.
- [ ] Confirm New and verify the paper, preview, history, save state, and
  active local state reset to a pristine snowflake.
- [ ] Verify Undo and Redo are disabled/enabled exactly according to history.
- [ ] At a narrow width, verify controls move into **More** instead of
  wrapping or being clipped.
- [ ] Open More, verify menu roles, labels, disabled states, and positioning.
- [ ] Run an item from More and verify the menu closes and the action executes.
- [ ] Close More by clicking outside, pressing Escape, resizing, and scrolling.
- [ ] Verify a toolbar menu never renders behind a panel or outside the viewport.

## 5. Freehand cutting

For each accepted cut, verify the folded geometry changes, the unfolded
Preview updates, Undo becomes enabled, and the status text communicates the
result.

- [ ] Draw a simple edge-to-edge stroke beginning just outside the paper.
- [ ] Draw with both endpoints just outside the paper.
- [ ] Draw with an endpoint close enough to test edge snapping.
- [ ] Draw a stroke that exits and re-enters through the same edge.
- [ ] Make one arc cut that returns through a fold edge, then a second separate
  arc cut along that edge. Verify Preview and printed outlines contain only the
  cut holes, with no straight lines to the outer perimeter or between holes.
  Repeat on both fold edges and with side counts from 4 through 10.
- [ ] Draw a multi-segment zigzag crossing the paper.
- [ ] Draw a cut near each edge and at each corner of the folded wedge.
- [ ] Draw a stroke in the opposite direction and verify equivalent geometry.
- [ ] Draw an interior-only stroke and verify it is rejected with a useful
  status message and no history entry.
- [ ] Draw a stroke that starts and ends away from edges and verify rejection.
- [ ] Draw a stroke with insufficient inside length and verify rejection.
- [ ] Draw outside the paper without entering it and verify no cut is added.
- [ ] Start a stroke, leave the canvas, and release the pointer. Verify the
  draft is cancelled or finalized safely without a stuck drawing state.
- [ ] Start a stroke and press Escape or otherwise cancel input if supported.
- [ ] Draw rapidly, slowly, with many points, and with a long curved path.
- [ ] Verify self-intersecting or complex paths either produce valid geometry
  or show an explicit failure without corrupting the prior design.
- [ ] Repeat cuts until very little paper remains; verify the editor remains
  usable and geometry failures preserve the last stable design.
- [ ] Try a cut that would remove all paper; verify it is rejected safely.
- [ ] Verify falling cut scraps/animation do not change the saved geometry.

## 6. Straight cuts and shortcuts

- [ ] Select Straight and draw a valid edge-to-edge cut.
- [ ] On desktop, hold Shift while drawing in Freehand and verify the stroke is
  treated as a straight cut without changing the selected tool.
- [ ] Hold Shift while drawing an invalid path and verify normal validation
  still applies.
- [ ] Verify Straight mode does not remain armed after the cut is applied or
  cancelled.
- [ ] Start a straight cut (Straight tool or Shift) outside the paper and
  release inside it. Verify the paper is unchanged, a dot marks the corner,
  the status says the straight cut is in progress, and **Cancel cut** appears.
- [ ] Move the mouse and verify the next segment follows the pointer from the
  corner. Click or drag to add corners, finish outside the paper, and verify
  the whole path is applied as one cut.
- [ ] Verify a completed multi-segment cut is removed by a single Undo and
  restored by a single Redo.
- [ ] While a cut is pending, verify Undo removes the last corner, undoing the
  first segment cancels the cut, and Redo is disabled.
- [ ] Verify releasing Shift (Shift cuts only), Escape, **Cancel cut**,
  switching tools, and **Random cut** each cancel a pending cut without
  changing the paper.
- [ ] Start a Shift or Straight tool cut inside the paper and verify it is
  rejected without leaving a pending cut.
- [ ] On a touch device, lift a straight cut inside the paper, then tap and
  drag to add corners and finish outside the paper. Verify a pinch or touch
  cancellation drops only the segment in progress.
- [ ] On a phone-sized screen, verify **Cancel cut** is easy to reach and does
  not cover the Edit tool rail.
- [ ] On a touch device, long-press Edit long enough to arm a one-time straight
  cut, then drag through the paper and verify it is accepted as straight.
- [ ] Verify a short touch tap does not accidentally arm Straight mode.
- [ ] Verify moving before the long-press threshold cancels arming as expected.
- [ ] Verify the armed touch state is one-time and subsequent cuts return to
  normal Freehand behavior.
- [ ] Interrupt a long press with touch cancellation, another finger, or
  leaving the panel; verify no stuck armed state remains.

## 7. Circle cuts

- [ ] Select Circle and move the pointer inside the paper. Verify a circle
  preview follows the pointer.
- [ ] Click/tap inside the paper and verify a circular cut is applied.
- [ ] Apply a circle fully inside the paper.
- [ ] Apply a circle overlapping each paper edge.
- [ ] Position a circle completely outside the paper and verify it does not
  remove material and reports the reason.
- [ ] Increase and decrease radius with Ctrl+wheel on Windows/Linux.
- [ ] Increase and decrease radius with Command+wheel on macOS.
- [ ] Verify radius is clamped at its minimum and maximum.
- [ ] Hold Ctrl/Command while drawing with another selected tool and verify
  Circle is used temporarily without changing the selected tool.
- [ ] Release the modifier during movement/click and verify no stuck circle
  mode remains.
- [ ] Verify a circle that would remove all remaining paper is rejected.
- [ ] Toggle **Resize circle** and verify its active state.
- [ ] On touch, use Resize circle plus a two-finger pinch to change radius.
- [ ] On touch, turn Resize circle off and verify pinch zooms instead.
- [ ] Verify tapping applies the current circle radius and does not zoom when
  the gesture is intended as a cut.
- [ ] Interrupt a circle gesture and verify no partial cut is added.

## 8. Undo, redo, reset, and save-state behavior

- [ ] Undo one accepted cut and verify the folded and unfolded views revert.
- [ ] Undo multiple cuts in sequence.
- [ ] Undo until empty and verify Undo disables.
- [ ] Redo one and multiple cuts and verify exact restoration.
- [ ] Make a new cut after Undo and verify the Redo branch is cleared.
- [ ] Verify rejected cuts do not create Undo/Redo entries.
- [ ] Use toolbar Undo/Redo and the keyboard shortcuts:
  `Ctrl+Z`/`Ctrl+Y` on Windows/Linux and
  `Command+Z`/`Command+Shift+Z` on macOS.
- [ ] Focus a text/color/range control and verify browser editing behavior is
  not unexpectedly replaced by the editor shortcut.
- [ ] Verify New clears both Undo and Redo.
- [ ] Undo a cut that triggered Expand to fill paper and verify the design
  returns to its exact pre-cut shape in one step; Redo restores the expanded
  design.
- [ ] Verify Save to collection is enabled only when the current design differs
  from the last saved version.
- [ ] Save, make a change, undo back to the saved signature, and verify Save
  disables again.
- [ ] Save, make a change, save again, and verify a new collection item is
  created rather than silently overwriting the old one.

## 9. Zoom, pan, spin, and gesture isolation

- [ ] Wheel over Edit and verify only Edit zooms.
- [ ] Wheel over Preview and verify only Preview zooms.
- [ ] Verify the zoom badge shows the current percentage for each panel.
- [ ] Zoom in and out repeatedly and verify scale remains within usable bounds.
- [ ] Verify zooming around different pointer positions preserves the intended
  focal point.
- [ ] Verify the hidden reset behavior returns a panel to 100% when invoked
  through supported UI/keyboard interaction.
- [ ] Middle-click drag a zoomed Edit panel on desktop and verify it pans.
- [ ] Middle-click drag a zoomed Preview panel and verify it pans.
- [ ] Verify panning is unavailable or harmless at 100% scale.
- [ ] Verify left-button drawing is not mistaken for panning.
- [ ] Verify right-click/context-menu behavior does not corrupt the editor.
- [ ] Pinch zoom Edit and Preview independently on touch.
- [ ] Verify two-finger gestures do not add a cut.
- [ ] Verify one-finger drawing and two-finger pinch transition cleanly.
- [ ] Verify clicking/tapping Preview pauses/resumes only the spin, not zoom or
  pan.
- [ ] Leave and re-enter a panel after zooming and verify animation/input
  remains responsive.

## 10. Options dialog

- [ ] Open Options and verify all controls reflect the current design.
- [ ] Move Preview representation through Outline, Outline and body, and Body.
- [ ] Verify the Preview appearance changes live while the dialog remains open.
- [ ] In Outline mode, verify body color controls are disabled.
- [ ] In Body mode, verify outline color and thickness controls are disabled.
- [ ] In Outline and body mode, verify all relevant controls are enabled.
- [ ] Change exterior outline color and verify only exterior outlines change.
- [ ] Change interior outline color and verify only interior outlines change.
- [ ] Change snowflake body color and verify the body changes.
- [ ] Set exterior and interior thickness to minimum, midpoint, and maximum.
- [ ] Verify displayed thickness values use one decimal place and match the
  rendered strokes.
- [ ] Set side count to each value from 4 through 10.
- [ ] Verify the side-count value and explanatory notes update.
- [ ] With existing cuts, stage a changed side count and verify the warning
  says current progress will be lost.
- [ ] Cancel a side-count change and verify cuts, side count, and print
  eligibility are unchanged.
- [ ] Save a side-count change and verify a pristine new snowflake is created,
  history is cleared, and the status names the new side count.
- [ ] Verify print controls are enabled for six sides and disabled for 4, 5,
  7, 8, 9, and 10 sides.
- [ ] Select Letter and verify the change is staged only.
- [ ] Select A4, cancel, and verify the print sheet remains Letter.
- [ ] Select A4, save, and verify the print sheet changes to A4 dimensions.
- [ ] Click Restore defaults and verify appearance controls and side count are
  staged to defaults without immediately committing the dialog.
- [ ] Restore defaults, then Cancel, and verify the original snapshot returns.
- [ ] Restore defaults, then Save, and verify defaults are committed.
- [ ] Close Options with Save, Cancel, backdrop click, and Escape.
- [ ] Verify Cancel restores all appearance changes made since opening, not
  merely the last individual control value.
- [ ] Reopen Options after saving and verify the committed values persist.
- [ ] Verify Expand to fill paper is checked by default and its note says it
  applies to cuts made afterward.
- [ ] With Expand to fill paper on, trim the whole outer (top) edge of the
  folded paper with one cut. Verify the remaining design grows until it touches
  the outer edge again, keeps its proportions, and the status mentions the
  expansion. Verify the unfolded Preview is larger and has no stray seams along
  the fold lines.
- [ ] Trim the outer edge with several cuts, none of which clears it alone, and
  verify expansion happens only after the cut that leaves a gap along the
  entire outer edge.
- [ ] Make a cut that leaves part of the design on the outer edge and verify
  nothing expands.
- [ ] Repeat the trim with a Straight cut and with Circle cuts, and at several
  side counts.
- [ ] Turn Expand to fill paper off, repeat the trim, and verify the design
  stays at its drawn size.
- [ ] Toggle Expand to fill paper between cuts and verify the toggle itself
  never rescales the current design.
- [ ] Verify the setting persists after saving Options and reloading Studio,
  that Restore defaults turns it back on, and that Cancel discards a change
  made since the dialog opened.
- [ ] Load a design saved before this option existed (from Collection or an
  imported share file) and verify Expand to fill paper is on.
- [ ] Verify focus enters the dialog, remains usable, and returns to a sensible
  control after close.

## 11. Studio persistence and storage failures

- [ ] Make cuts, change options, reload Studio, and verify the active design,
  options, Undo/Redo stacks, and save-state behavior restore correctly.
- [ ] Navigate to Collection and back to Studio and verify active work remains.
- [ ] Use New and reload; verify the cleared design is not restored.
- [ ] Save a design to Collection, reload, and verify it remains saved.
- [ ] Open DevTools and inspect localStorage keys for active Studio and
  Collection state without exposing unrelated site data.
- [ ] Replace active-state storage with malformed JSON and reload; verify the
  app opens safely with a usable default rather than a crash.
- [ ] Replace collection storage with malformed JSON, a non-array, and an
  array containing malformed items; verify invalid entries are ignored safely.
- [ ] Simulate unavailable or quota-exceeded localStorage. Verify the app
  remains usable and shows an explicit failure status where the operation
  cannot be completed.
- [ ] Use private browsing or a restrictive storage policy and verify no
  uncaught error occurs.
- [ ] Clear site data and verify the app starts cleanly and explains, through
  normal behavior/help text, that local designs are gone.

## 12. Save to Collection

- [ ] Create a distinct cut and click **Save to collection**.
- [ ] Verify a success status appears and Save becomes disabled for the same
  signature.
- [ ] Verify the item appears newest first on Collection.
- [ ] Save the same design after making a meaningful change and verify the
  changed design is a separate item.
- [ ] Save designs with each supported side count and appearance mode.
- [ ] Verify previews accurately represent the saved design and options.
- [ ] Save at least 120 designs, then save one more. Verify the collection
  remains capped at 120, newest is first, and the oldest is removed.
- [ ] Verify duplicate timestamp/id conditions do not make saved tiles
  disappear or replace the wrong item.
- [ ] Verify saving with no removable cut is disabled or reports a clear
  "nothing to add" result.

## 13. Collection page

- [ ] Verify the empty state, disabled Clear all button, and Import control.
- [ ] Verify each saved tile displays a preview and Edit, Share, Delete, and
  More actions.
- [ ] Edit a saved item with no active Studio changes and verify it opens in
  Studio with matching geometry/options.
- [ ] With active Studio changes, click Edit and verify the replacement
  confirmation appears.
- [ ] Cancel replacement via button, backdrop, and Escape; verify Studio work
  remains.
- [ ] Confirm replacement; verify the selected collection item loads and its
  options/preview match.
- [ ] Delete an item and verify confirmation text identifies deletion.
- [ ] Cancel deletion and verify the item remains.
- [ ] Confirm deletion and verify only that item is removed.
- [ ] Delete the first, middle, and last item in a multi-item collection.
- [ ] Click Clear all with multiple items, cancel, and verify all remain.
- [ ] Confirm Clear all and verify the empty state and disabled button return.
- [ ] Reload Collection after edit/delete/clear and verify persistence.
- [ ] Verify tile actions remain usable at narrow widths and move into More
  without clipping.
- [ ] Verify More contains Share/Delete when compact and Print/Save actions in
  all layouts, with a divider in the expected location.
- [ ] Verify disabled print actions for non-six-sided saved designs show an
  explanatory tooltip and cannot run.

## 14. Share and import

- [ ] Click Share on a valid saved item and verify a download occurs.
- [ ] Verify the filename matches `snowflake-YYYYMMDD-HHMMSS.snowflake.json`.
- [ ] Verify the file is JSON with the expected share type, schema version,
  geometry, normalized options, preview, and export timestamp.
- [ ] Open the downloaded file in a text editor and verify it is readable,
  indented JSON and contains no local-only collection identifiers.
- [ ] Import the file into an empty Collection and verify a new tile appears.
- [ ] Import the same file repeatedly and verify each import behaves according
  to the product's duplicate policy without corrupting existing items.
- [ ] Import a share file into a non-empty Collection and verify existing items
  remain.
- [ ] Import a file with valid geometry but no preview SVG and verify a preview
  is regenerated.
- [ ] Import malformed JSON and verify the item is not added and a clear
  status says the file is invalid.
- [ ] Import JSON with the wrong `type`, missing geometry, invalid geometry,
  invalid options, and unexpected fields. Verify safe rejection/normalization.
- [ ] Choose a non-JSON file, an empty file, and a very large file. Verify no
  crash and an actionable status.
- [ ] Cancel the file picker and verify no status/error or state change.
- [ ] Verify Share and Edit are disabled for a deliberately malformed legacy
  item that lacks usable geometry.
- [ ] Verify importing and then editing/printing the item preserves geometry
  and appearance.

## 15. Printing and PDF export

- [ ] On a six-sided design, click **Print instructions** and verify the browser
  print dialog/print preview opens once.
- [ ] Verify the print sheet contains the square cut line, fold lines, dotted
  third-fold guides, wedge top cut, cut paths, six written instructions, and
  preview.
- [ ] Verify the animated app UI and dialogs are hidden from print output.
- [ ] Verify print output uses cut outlines and does not print fold-seam body
  paths as cut lines.
- [ ] Choose Letter and verify the sheet dimensions and orientation are correct.
- [ ] Choose A4 and verify the sheet dimensions and orientation are correct.
- [ ] Set a non-six-sided design and verify Print instructions is disabled and
  cannot invoke printing.
- [ ] Click **Save instructions** and verify a PDF downloads with filename
  `snowflake-instructions-YYYYMMDD-HHMMSS.pdf`.
- [ ] Open the PDF and verify it is valid, readable, complete, and visually
  consistent with browser print preview.
- [ ] Verify PDF export includes the selected Letter/A4 paper dimensions.
- [ ] Trigger Save instructions repeatedly/quickly and verify only one export
  runs at a time, the button shows Saving, and the status updates.
- [ ] Simulate a PDF generation/download failure and verify the busy state
  clears and an explicit failure status appears.
- [ ] From a Collection tile, print and save instructions and verify they use
  that tile's geometry/options without changing active Studio state.
- [ ] Print/save a collection item with unavailable geometry and verify the
  operation is rejected with an actionable status.
- [ ] Verify print output with no cuts, one cut, many cuts, each supported
  preview mode, and extreme outline widths/colors.

## 16. Responsive layout and touch UX

- [ ] At phone width, verify headings, navigation, panels, tool rail, buttons,
  status, dialogs, and collection tiles fit without horizontal clipping.
- [ ] At tablet width, verify the two-panel layout transitions cleanly and
  controls remain reachable.
- [ ] Rotate a touch device and verify canvas sizes, toolbars, and menu portals
  recalculate correctly.
- [ ] Verify tap targets are large enough and taps do not require precision
  beyond the visible control.
- [ ] Verify touch tooltip behavior: long-press a tool, observe its tooltip,
  release, and verify it closes after the expected delay.
- [ ] Verify a touch tooltip does not remain open after switching tools,
  scrolling, opening a dialog, or navigating.
- [ ] Verify scrolling the page does not accidentally draw, pan, or zoom a
  panel.
- [ ] Verify touch drawing works near all paper edges and at zoomed scales.
- [ ] Verify browser pinch-to-zoom/page zoom is not confused with app pinch
  gestures.

## 17. Accessibility and keyboard-only use

- [ ] Navigate the entire Studio page with Tab and Shift+Tab only.
- [ ] Verify every interactive control has an accessible name and visible
  focus indicator.
- [ ] Verify tool buttons expose selected state through `aria-pressed`.
- [ ] Verify dialogs expose an accessible name/title and are modal.
- [ ] Verify focus is trapped in each open dialog and restored after close.
- [ ] Close Help, Options, and confirmation dialogs with Escape.
- [ ] Operate New, Undo, Redo, tools, Options, Save, and Collection navigation
  without a mouse.
- [ ] Operate More menus with keyboard, including disabled menu items and
  Escape/outside dismissal.
- [ ] Verify status messages are readable by assistive technology and do not
  require visual animation to understand success/failure.
- [ ] Verify color controls have labels and range controls expose meaningful
  values, min/max, and current value.
- [ ] Verify disabled print/save controls communicate why they are disabled.
- [ ] Run a screen reader smoke test in Narrator/VoiceOver/NVDA where
  available. Confirm headings, navigation, dialogs, buttons, menus, and
  empty states are announced in a useful order.
- [ ] Check contrast for text, status messages, tooltips, focus rings, buttons,
  snowflake outlines, and disabled controls.
- [ ] Verify content remains understandable with animation-reduction settings
  or when animations are paused.

## 18. Visual quality and robustness

- [ ] Check light/dark or system color environments supported by the browser.
- [ ] Verify no text overlaps at long status messages, long filenames, or
  translated/expanded browser UI text.
- [ ] Verify SVGs render crisply at high-DPI and browser zoom levels.
- [ ] Verify random-cut animation and background snowfall do not cause visible
  jank during drawing or dialogs.
- [ ] Leave the app open for several minutes and verify no progressive memory,
  animation, or CPU issue is apparent.
- [ ] Open/close dialogs and More menus repeatedly and verify no duplicate
  overlays, event handlers, or stale menu portals accumulate.
- [ ] Rapidly switch tools while drawing, zooming, opening Options, and
  navigating. Verify the app remains in a coherent state.
- [ ] Verify console output is free of uncaught exceptions, React warnings,
  failed resource loads, and repeated errors during normal workflows.
- [ ] Verify refresh, Back/Forward, print cancel, file-picker cancel, and dialog
  cancel all leave the app usable.

## 19. Release smoke path

- [ ] Clean start in Studio.
- [ ] Make one valid freehand cut and confirm Preview updates.
- [ ] Undo and redo the cut.
- [ ] Change appearance in Options, save, and confirm the live result.
- [ ] Save to Collection.
- [ ] Navigate to Collection, edit the saved item, and confirm replacement.
- [ ] Share the item, import the file, and verify the imported preview.
- [ ] Print or save instructions for the six-sided design.
- [ ] Change to seven sides and verify print actions disable.
- [ ] Reload both pages and verify active work and collection items persist.
- [ ] Delete the test items and clear local data after the run.

## 20. Defect report requirements

For every failure, include:

- [ ] Test-case section and exact step that failed.
- [ ] Expected result and actual result.
- [ ] Reproduction rate and whether the issue is deterministic.
- [ ] Browser version, OS, device, viewport, browser zoom, and touch/mouse
  input type.
- [ ] Whether the design had cuts, which tool was active, side count, preview
  mode, and print paper size.
- [ ] Console errors, network errors, and relevant localStorage state with
  secrets or unrelated data removed.
- [ ] Screenshot, screen recording, downloaded share file/PDF, or print preview
  when it clarifies the issue.
- [ ] Minimal reproduction steps and any workaround.

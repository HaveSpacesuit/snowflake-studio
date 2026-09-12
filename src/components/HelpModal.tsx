import { useEffect, useRef } from "react";

/** Static "How to use" dialog, shown from the Studio header. */
export default function HelpModal({ open, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  const handleBackdropClick = (event) => {
    if (event.target === ref.current) ref.current.close();
  };

  return (
    <dialog
      ref={ref}
      className="helpModal"
      aria-labelledby="helpModalTitle"
      onClose={onClose}
      onClick={handleBackdropClick}
    >
      <form method="dialog" className="helpModalContent">
        <div className="helpModalHeader">
          <h2 id="helpModalTitle">How Snowflake Studio Works</h2>
          <button type="submit" className="helpCloseButton" aria-label="Close help dialog">Close</button>
        </div>

        <p className="helpLead">
          Snowflake Studio simulates cutting a folded triangular wedge of paper. Draw cuts in the
          <strong> Edit</strong> panel and watch the fully unfolded design update in the
          <strong> Preview</strong> panel. Work is kept in this browser, so you can experiment
          freely without creating an account.
        </p>

        <div className="helpGrid">
          <section className="helpDesktopOnly">
            <h3>Desktop controls</h3>
            <ul>
              <li><strong>Wheel</strong> over either panel zooms that panel. <strong>Middle-click and drag</strong> a zoomed panel to pan.</li>
              <li>Choose <strong>Freehand</strong>, <strong>Straight</strong>, or <strong>Circle</strong> from the Edit tool rail.</li>
              <li>Hold <strong>Shift</strong> while drawing to make the next freehand stroke straight.</li>
              <li>In <strong>Circle</strong> mode, move the pointer to position the circle, use <strong>Ctrl + wheel</strong> (or <strong>Command + wheel</strong> on macOS) to resize it, then click to cut.</li>
              <li>Hold <strong>Ctrl</strong> or <strong>Command</strong> while drawing in Edit to temporarily use Circle mode without changing the selected tool.</li>
              <li><strong>New</strong> clears the current design after confirmation. <strong>Undo</strong> and <strong>Redo</strong> manage accepted cuts.</li>
              <li>Keyboard shortcuts are <strong>Ctrl + Z</strong> / <strong>Ctrl + Y</strong> on Windows and Linux, and <strong>Command + Z</strong> / <strong>Command + Shift + Z</strong> on macOS.</li>
            </ul>
          </section>

          <section className="helpMobileOnly">
            <h3>Touch controls</h3>
            <ul>
              <li><strong>Pinch with two fingers</strong> on either panel to zoom. The zoom badge shows the current scale.</li>
              <li>Choose <strong>Freehand</strong>, <strong>Straight</strong>, or <strong>Circle</strong> from the Edit tool rail.</li>
              <li><strong>Long-press</strong> on Edit to arm a one-time straight cut, then drag through the paper.</li>
              <li>In <strong>Circle</strong> mode, tap <strong>Resize circle</strong>, pinch to change the radius, and tap it again when you want pinch to zoom instead.</li>
              <li><strong>New</strong> clears the current design after confirmation. <strong>Undo</strong> and <strong>Redo</strong> manage accepted cuts.</li>
            </ul>
          </section>

          <section>
            <h3>Making valid cuts</h3>
            <ul>
              <li>For freehand and straight cuts, begin and end just <strong>outside</strong> the folded paper so the path clearly crosses an edge. A start point close to an edge snaps to that edge.</li>
              <li>A cut may leave and return through the <strong>same edge</strong>; both endpoints still need to reach an edge.</li>
              <li>Interior-only freehand and straight strokes are rejected. If a stroke is rejected, simplify it or start farther outside the paper.</li>
              <li>Circle cuts are valid when the circle is inside the paper or overlaps its edge. A circle that does not overlap the paper does not remove anything.</li>
              <li><strong>Random cut</strong> creates a valid example cut and limits the amount removed so it is safe for exploring the editor.</li>
            </ul>
          </section>

          <section>
            <h3>Preview and appearance</h3>
            <ul>
              <li>The Preview panel unfolds the current folded geometry and spins it automatically. Click or tap Preview to pause or resume the spin.</li>
              <li>Use <strong>Options</strong> to choose outline, body, or outline-and-body preview; set body and interior/exterior outline colors; and adjust outline thickness.</li>
              <li>Options are applied live while the dialog is open. Choose <strong>Cancel</strong> to restore the values from when it opened, or <strong>Restore defaults</strong> to stage the default appearance.</li>
              <li>Side count can be set from <strong>4 through 10</strong>. Saving a changed side count starts a new snowflake because the folded base geometry changes.</li>
            </ul>
          </section>

          <section>
            <h3>Save, share, and print</h3>
            <ul>
              <li><strong>Save to collection</strong> stores the current design in this browser's local storage. The in-progress Studio design is also restored when you return to the app.</li>
              <li>Open <strong>Collection</strong> to edit, share, delete, or print a saved design. Editing replaces the current Studio design only after confirmation.</li>
              <li><strong>Share</strong> downloads a portable <code>.snowflake.json</code> file. On another device, open Collection, choose <strong>Import</strong>, and select that file.</li>
              <li>The collection keeps up to <strong>120 designs</strong>; saving a new design adds it to the front and removes the oldest design when the limit is exceeded.</li>
              <li><strong>Print instructions</strong> opens the browser print dialog. <strong>Save instructions</strong> downloads a PDF. Both are enabled only for six-sided snowflakes and support Letter or A4 paper in Options.</li>
              <li>Printing uses the instruction sheet, not the animated Preview panel. Check the browser print preview and choose the paper size before confirming.</li>
            </ul>
          </section>
        </div>

        <p className="helpFooter">
          <a
            href="https://github.com/HaveSpacesuit/snowflake-studio/issues/new"
            target="_blank"
            rel="noreferrer"
          >
            Submit bug report
          </a>
        </p>
      </form>
    </dialog>
  );
}

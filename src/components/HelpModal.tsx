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
          Draw on the Edit panel and watch the Preview panel update live. The app is built for
          edge-to-edge cuts, quick experimentation, saving, and export. For freehand and straight
          cuts, begin and end just outside the folded shape so your path clearly crosses it.
        </p>

        <div className="helpGrid">
          <section className="helpDesktopOnly">
            <h3>Controls</h3>
            <ul>
              <li><strong>Wheel</strong> over either panel to zoom in or out.</li>
              <li><strong>Middle-click and drag</strong> a zoomed panel to pan around.</li>
              <li>Use the Edit toolbar to pick <strong>Freehand</strong>, <strong>Straight</strong>, or <strong>Circle</strong> mode.</li>
              <li>When starting a cut, click slightly <strong>outside</strong> the folded shape, then cross through it.</li>
              <li>If your start point is very close to an edge, it <strong>snaps to that edge</strong>.</li>
              <li><strong>Shift</strong> while drawing is still a straight-line shortcut.</li>
              <li>In <strong>Circle</strong> mode, use <strong>Ctrl + wheel</strong> or <strong>Command + wheel</strong> on macOS to adjust radius; <strong>click</strong> applies the cut.</li>
              <li>Hold <strong>Ctrl</strong>, or <strong>Command</strong> on macOS, over Edit to temporarily use the Circle tool; click to apply the circle cut without switching tools.</li>
              <li><strong>New</strong> starts over after confirmation when you have changes; <strong>Undo</strong> and <strong>Redo</strong> manage your cut history. Use <strong>Ctrl + Z</strong> and <strong>Ctrl + Y</strong>, or <strong>Command + Z</strong> and <strong>Command + Shift + Z</strong> on macOS.</li>
              <li><strong>Random cut</strong> adds a valid example cut for you.</li>
              <li><strong>Save to collection</strong> saves the current design locally. Visit <strong>Collection</strong> to edit or delete saved designs.</li>
              <li><strong>Export SVG</strong> downloads the current snowflake as a vector file. <strong>Options</strong> changes preview appearance; saving a new side count starts a fresh snowflake.</li>
              <li>Click the <strong>Preview</strong> panel to pause or resume the spin.</li>
            </ul>
          </section>

          <section className="helpMobileOnly">
            <h3>Touch controls</h3>
            <ul>
              <li><strong>Pinch with two fingers</strong> on either panel to zoom in or out.</li>
              <li>Start each cut a little <strong>outside</strong> the folded shape, then drag through it.</li>
              <li>Use the Edit toolbar to pick <strong>Freehand</strong>, <strong>Straight</strong>, or <strong>Circle</strong> mode.</li>
              <li>If your start point is very close to an edge, it <strong>snaps to that edge</strong>.</li>
              <li><strong>Long-press</strong> on the Edit panel to arm straight-line mode, then drag for your next touch cut.</li>
              <li>In <strong>Circle</strong> mode, tap <strong>Resize circle</strong>, then <strong>pinch</strong> on the Edit panel to resize the circle. Tap Resize circle again to return pinch to zoom.</li>
              <li><strong>New</strong> starts over after confirmation when you have changes; <strong>Undo</strong> and <strong>Redo</strong> manage your cut history.</li>
              <li><strong>Random cut</strong> adds a valid example cut for you.</li>
              <li><strong>Save to collection</strong> saves the current design locally. Visit <strong>Collection</strong> to edit or delete saved designs.</li>
              <li><strong>Export SVG</strong> downloads the current snowflake as a vector file. <strong>Options</strong> changes preview appearance; saving a new side count starts a fresh snowflake.</li>
              <li>Tap the <strong>Preview</strong> panel to pause or resume the spin.</li>
            </ul>
          </section>

          <section>
            <h3>Cut examples</h3>
            <ul>
              <li>Start just outside one edge, sweep through the folded paper, and finish just outside another edge.</li>
              <li>A cut can leave and return to the <strong>same edge</strong> as long as both endpoints land on edges.</li>
              <li className="helpDesktopOnly">Try a short straight slice with <strong>Shift</strong> held down, or a longer curved pass for something more organic.</li>
              <li className="helpMobileOnly">Try a short straight slice after a <strong>long-press</strong>, or a longer curved pass for something more organic.</li>
              <li>Freehand and straight cuts that start or end in the interior will be rejected. Circle cuts are valid when they are fully inside the paper or overlap its edge.</li>
            </ul>
          </section>
        </div>
      </form>
    </dialog>
  );
}

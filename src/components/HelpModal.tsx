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
          edge-to-edge cuts, quick experimentation, and easy export. Tip: begin and end just outside
          the folded shape so your path clearly crosses it.
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
              <li>In <strong>Circle</strong> mode, <strong>wheel</strong> adjusts radius and <strong>click</strong> applies the cut.</li>
              <li><strong>Ctrl</strong> on Edit temporarily previews circle mode without switching tools.</li>
              <li><strong>New</strong>, <strong>Undo</strong>, and <strong>Redo</strong> manage your cut history.</li>
              <li><strong>Random cut</strong> adds a valid example cut for you.</li>
              <li><strong>Export SVG</strong> downloads the current snowflake as a vector file.</li>
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
              <li>In <strong>Circle</strong> mode, <strong>pinch</strong> on the Edit panel to resize the circle, then tap to apply the cut.</li>
              <li><strong>New</strong>, <strong>Undo</strong>, and <strong>Redo</strong> manage your cut history.</li>
              <li><strong>Random cut</strong> adds a valid example cut for you.</li>
              <li><strong>Export SVG</strong> downloads the current snowflake as a vector file.</li>
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
              <li>A cut that starts or ends in the interior will be rejected.</li>
            </ul>
          </section>
        </div>
      </form>
    </dialog>
  );
}

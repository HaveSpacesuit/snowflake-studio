import { useLayoutEffect, useRef, useState } from "react";

/**
 * Detects whether a horizontal row of toolbar buttons no longer has room to
 * show every button on one line. The natural (fully expanded) width of the
 * given buttons is measured once, then re-checked against the container's
 * available width whenever it resizes. Callers use the result to swap some
 * buttons for a "More" dropdown instead of letting the row wrap onto a
 * second line.
 */
export function useToolbarOverflow(containerRef, buttonRefs) {
  // The natural (unwrapped) width of the toolbar never changes, so it's
  // measured once (while every button is still visible) and reused on every resize.
  const naturalWidthRef = useRef(null);
  const [compact, setCompact] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const checkFit = () => {
      if (naturalWidthRef.current == null) {
        const buttons = buttonRefs.map((ref) => ref.current);
        if (buttons.every(Boolean)) {
          // Adjacent buttons overlap borders by 1px (see `.panelActions > button + button`).
          naturalWidthRef.current = buttons.reduce((sum, el) => sum + el.offsetWidth, 0) - (buttons.length - 1);
        }
      }
      if (naturalWidthRef.current == null) return;
      // `clientWidth` includes the container's own padding, which isn't available to its children.
      const style = getComputedStyle(container);
      const availableWidth = container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      setCompact(availableWidth < naturalWidthRef.current);
    };

    checkFit();
    const observer = new ResizeObserver(checkFit);
    observer.observe(container);
    return () => observer.disconnect();
    // Ref identities are stable for the lifetime of the caller's component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return compact;
}

import { Fragment, forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * A "More" button plus a portal-rendered dropdown of `items`. Used by any
 * toolbar that has too many buttons to fit on one line: buttons that don't
 * fit are folded into this menu instead of wrapping to a second row.
 * Rendered via a portal so it isn't clipped by an ancestor's rounded-corner
 * `overflow: hidden`.
 *
 * Forwards `ref` to the "More" button itself (not a wrapper) so it stays a
 * direct child of `.panelActions`, preserving the joined-button-group CSS
 * selectors (`:first-child`/`:last-child`/`+ button`).
 */
const ToolbarMoreMenu = forwardRef<HTMLButtonElement, any>(function ToolbarMoreMenu({ items }, forwardedRef) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  useImperativeHandle(forwardedRef, () => buttonRef.current, []);

  const updatePosition = () => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const menu = menuRef.current;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const menuWidth = menu?.getBoundingClientRect().width ?? 190;
    const menuHeight = menu?.getBoundingClientRect().height ?? 0;
    const spaceBelow = viewportHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openAbove = menuHeight > spaceBelow && spaceAbove > spaceBelow;
    const maxTop = Math.max(8, viewportHeight - menuHeight - 8);
    const top = Math.min(
      Math.max(openAbove ? rect.top - menuHeight - 4 : rect.bottom + 4, 8),
      maxTop
    );
    const left = Math.min(Math.max(rect.left, 8), Math.max(8, viewportWidth - menuWidth - 8));

    setMenuPosition((current) =>
      current?.top === top && current?.left === left ? current : { top, left }
    );
  };

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, menuPosition]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event) => {
      if (buttonRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const runAndClose = (action) => {
    setOpen(false);
    action?.();
  };

  return (
    <>
      <button
        type="button"
        ref={buttonRef}
        className="toolbarMoreBtn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        More
      </button>
      {open && menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="toolbarMoreMenu"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            {items.map((item) => (
              <Fragment key={item.key}>
                {item.dividerBefore && <div className="toolbarMoreMenuDivider" role="separator" />}
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  aria-busy={item.busy}
                  title={item.title}
                  onClick={() => runAndClose(item.onClick)}
                >
                  {item.label}
                </button>
              </Fragment>
            ))}
          </div>,
          document.body
        )}
    </>
  );
});

export default ToolbarMoreMenu;

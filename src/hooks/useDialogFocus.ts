import { useEffect, useRef } from "react";

/** Wrap keyboard focus within a native modal and restore its launching control. */
export function useDialogFocus(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const launchingControl = document.activeElement;

    const restoreFocus = () => {
      if (launchingControl instanceof HTMLElement && launchingControl.isConnected) {
        launchingControl.focus();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialog.open) return;
      const controls = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "a[href], button, input, select, textarea, [tabindex], [contenteditable='true']"
        )
      ).filter((element) =>
        element.tabIndex >= 0 &&
        !element.matches(":disabled") &&
        !element.closest("[inert]") &&
        element.getClientRects().length > 0 &&
        getComputedStyle(element).visibility === "visible"
      );
      const first = controls[0];
      const last = controls[controls.length - 1];
      const active = document.activeElement;
      const atBoundary = active === (event.shiftKey ? first : last);

      if (!first) {
        event.preventDefault();
        dialog.focus();
      } else if (atBoundary || !controls.includes(active as HTMLElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };

    dialog.addEventListener("keydown", handleKeyDown);
    dialog.addEventListener("close", restoreFocus);
    return () => {
      dialog.removeEventListener("keydown", handleKeyDown);
      dialog.removeEventListener("close", restoreFocus);
      if (dialog.contains(document.activeElement)) restoreFocus();
    };
  }, [open]);

  return ref;
}

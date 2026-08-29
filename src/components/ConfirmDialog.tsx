import { useEffect, useRef } from "react";

/**
 * A native `<dialog>` that shows/hides based on `open` and resolves with a
 * boolean when closed. Used for "start new" and collection confirmations.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onResolve
}) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  const handleClose = () => {
    onResolve(ref.current?.returnValue === "confirm");
  };

  const handleBackdropClick = (event) => {
    if (event.target === ref.current) ref.current.close("cancel");
  };

  return (
    <dialog
      ref={ref}
      className="helpModal"
      aria-label={title}
      onClose={handleClose}
      onClick={handleBackdropClick}
    >
      <form method="dialog" className="helpModalContent">
        <div className="helpModalHeader">
          <h2>{title}</h2>
        </div>
        <p className="helpLead">{message}</p>
        <div className="collectionConfirmActions panelActions">
          <button type="submit" value="cancel">{cancelLabel}</button>
          <button id="collectionConfirmOk" type="submit" value="confirm">{confirmLabel}</button>
        </div>
      </form>
    </dialog>
  );
}

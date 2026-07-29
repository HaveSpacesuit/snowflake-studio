import { useCallback, useRef, useState } from "react";

/**
 * Promise-based confirmation dialog state. `confirm(options)` resolves to a
 * boolean; spread `dialogProps` onto a `<ConfirmDialog>`.
 */
export function useConfirm() {
  const [state, setState] = useState({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel"
  });
  const resolverRef = useRef(null);

  const confirm = useCallback(
    ({ title, message, confirmLabel = "Confirm", cancelLabel = "Cancel" }) =>
      new Promise((resolve) => {
        resolverRef.current = resolve;
        setState({ open: true, title, message, confirmLabel, cancelLabel });
      }),
    []
  );

  const onResolve = useCallback((result) => {
    setState((prev) => ({ ...prev, open: false }));
    const resolve = resolverRef.current;
    resolverRef.current = null;
    if (resolve) resolve(result);
  }, []);

  return { confirm, dialogProps: { ...state, onResolve } };
}

import { useEffect, useRef, useState } from "react";

/**
 * Generic vertical icon tools rail with custom tooltip styling.
 *
 * @param {{
 *   tools: Array<{
 *     id: string,
 *     label: string,
 *     icon: string,
 *     onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void,
 *     isActive?: boolean,
 *     disabled?: boolean,
 *     tooltip?: string,
 *     shortcutDesktop?: string,
 *     shortcutMobile?: string,
 *     buttonId?: string
 *   }>,
 *   ariaLabel?: string,
 *   className?: string
 * }} props
 */
export default function VerticalToolRail({ tools, ariaLabel = "Tools", className = "" }) {
  const [touchTooltipToolId, setTouchTooltipToolId] = useState(null);
  const longPressTimerRef = useRef(null);
  const hideTooltipTimerRef = useRef(null);
  const railClassName = ["verticalToolRail", className].filter(Boolean).join(" ");

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const clearHideTooltipTimer = () => {
    if (hideTooltipTimerRef.current !== null) {
      clearTimeout(hideTooltipTimerRef.current);
      hideTooltipTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearLongPressTimer();
      clearHideTooltipTimer();
    };
  }, []);

  const openTouchTooltip = (toolId) => {
    clearLongPressTimer();
    clearHideTooltipTimer();
    setTouchTooltipToolId(toolId);
  };

  const closeTouchTooltipSoon = (toolId) => {
    clearHideTooltipTimer();
    hideTooltipTimerRef.current = setTimeout(() => {
      hideTooltipTimerRef.current = null;
      setTouchTooltipToolId((current) => (current === toolId ? null : current));
    }, 1200);
  };

  const onToolTouchStart = (tool) => {
    if (tool.disabled) return;
    clearLongPressTimer();
    clearHideTooltipTimer();
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      openTouchTooltip(tool.id);
    }, 420);
  };

  const onToolTouchEnd = (tool) => {
    clearLongPressTimer();
    if (touchTooltipToolId === tool.id) {
      closeTouchTooltipSoon(tool.id);
    }
  };

  const onToolTouchCancel = () => {
    clearLongPressTimer();
    clearHideTooltipTimer();
    setTouchTooltipToolId(null);
  };

  return (
    <div className={railClassName} role="toolbar" aria-label={ariaLabel}>
      {tools.map((tool) => {
        const tooltipText = tool.tooltip || tool.label;
        const desktopHint = typeof tool.shortcutDesktop === "string" ? tool.shortcutDesktop.trim() : "";
        const mobileHint = typeof tool.shortcutMobile === "string" ? tool.shortcutMobile.trim() : "";
        const hasHint = desktopHint.length > 0 || mobileHint.length > 0;
        const handleToolClick = (event) => {
          tool.onClick?.(event);
          if (event.detail > 0) event.currentTarget.blur();
        };
        return (
          <button
            key={tool.id}
            id={tool.buttonId || undefined}
            type="button"
            className={[
              "verticalToolRailButton",
              touchTooltipToolId === tool.id ? "is-touch-tooltip-open" : ""
            ].filter(Boolean).join(" ")}
            aria-label={tool.label}
            aria-pressed={tool.isActive ? "true" : "false"}
            onClick={handleToolClick}
            onTouchStart={() => onToolTouchStart(tool)}
            onTouchEnd={() => onToolTouchEnd(tool)}
            onTouchCancel={onToolTouchCancel}
            disabled={Boolean(tool.disabled)}
          >
            <svg className="verticalToolRailIcon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <use href={`${tool.icon}#icon`} />
            </svg>
            <span className="verticalToolRailTooltip" aria-hidden="true">
              <span className="verticalToolRailTooltipLabel">{tooltipText}</span>
              {hasHint ? (
                <span className="verticalToolRailTooltipHint">
                  <span className="verticalToolRailHintDesktop">Shortcut: {desktopHint || mobileHint}</span>
                  <span className="verticalToolRailHintMobile">Mobile: {mobileHint || desktopHint}</span>
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

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
 *     buttonId?: string
 *   }>,
 *   ariaLabel?: string,
 *   className?: string
 * }} props
 */
export default function VerticalToolRail({ tools, ariaLabel = "Tools", className = "" }) {
  const railClassName = ["verticalToolRail", className].filter(Boolean).join(" ");

  return (
    <div className={railClassName} role="toolbar" aria-label={ariaLabel}>
      {tools.map((tool) => {
        const tooltipText = tool.tooltip || tool.label;
        return (
          <button
            key={tool.id}
            id={tool.buttonId || undefined}
            type="button"
            className="verticalToolRailButton"
            aria-label={tool.label}
            aria-pressed={tool.isActive ? "true" : "false"}
            onClick={tool.onClick}
            disabled={Boolean(tool.disabled)}
          >
            <svg className="verticalToolRailIcon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <use href={`${tool.icon}#icon`} />
            </svg>
            <span className="verticalToolRailTooltip" aria-hidden="true">{tooltipText}</span>
          </button>
        );
      })}
    </div>
  );
}

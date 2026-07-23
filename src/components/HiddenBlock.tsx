import { useState } from "react";
import { IconChevronDown } from "./Icons";
import { Markdown } from "./Markdown";

/**
 * A collapsed-by-default, expandable block for content hidden from the main
 * message body by a hidden-block rule. Shares the reasoning block's styling.
 */
export function HiddenBlock({ label, text }: { label: string; text: string }) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className={`reasoning hidden-block ${collapsed ? "collapsed" : ""}`}>
      <button
        type="button"
        className="reasoning-head"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        <span className="reasoning-label">{label || "Hidden"}</span>
        <span className="reasoning-chevron">
          <IconChevronDown size={15} />
        </span>
      </button>
      {!collapsed && (
        <div className="reasoning-body hidden-block-body">
          <Markdown text={text} />
        </div>
      )}
    </div>
  );
}

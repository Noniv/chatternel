import { useEffect, useRef, useState } from "react";
import { getAppState } from "../state/appStore";
import { IconChevronDown } from "./Icons";
import { Markdown } from "./Markdown";

export function ReasoningBlock({
  text,
  streaming,
  reasoningDone,
}: {
  text: string;
  streaming: boolean;
  reasoningDone: boolean;
}) {
  const [collapsed, setCollapsed] = useState(() =>
    streaming ? getAppState().settings.reasoningCollapsedByDefault : true,
  );
  const wasStreaming = useRef(streaming);

  useEffect(() => {
    if (wasStreaming.current && !streaming) setCollapsed(true);
    wasStreaming.current = streaming;
  }, [streaming]);

  const thinking = streaming && !reasoningDone;

  return (
    <div className={`reasoning ${collapsed ? "collapsed" : ""} ${thinking ? "thinking" : ""}`}>
      <button
        type="button"
        className="reasoning-head"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        <span className="reasoning-label">Reasoning</span>
        <span className="reasoning-chevron">
          <IconChevronDown size={15} />
        </span>
      </button>
      {!collapsed && (
        <div className="reasoning-body">
          <Markdown text={text} />
        </div>
      )}
    </div>
  );
}

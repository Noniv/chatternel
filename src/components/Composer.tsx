import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { sendMessage, stopStream } from "../lib/engine";
import { useStreamActive } from "../state/streamStore";
import { IconArrowUp, IconPlay, IconStop } from "./Icons";

const MAX_INPUT_HEIGHT = 160;

function hasFinePointer() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export function Composer({ convoId }: { convoId: string }) {
  const [text, setText] = useState("");
  const active = useStreamActive();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => ref.current?.focus(), 250);
    return () => window.clearTimeout(timer);
  }, [convoId]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, MAX_INPUT_HEIGHT) + "px";
  }, [text]);

  const mode = active ? "stop" : text.trim() ? "send" : "continue";

  const submit = () => {
    if (active) {
      stopStream();
      return;
    }
    if (sendMessage(text)) setText("");
  };

  return (
    <div className="composer">
      <div className="composer-card">
        <textarea
          ref={ref}
          className="composer-input"
          placeholder="Message…"
          rows={1}
          value={text}
          autoComplete="off"
          autoCorrect="on"
          autoCapitalize="sentences"
          spellCheck
          aria-label="Message"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              submit();
              return;
            }
            if (!e.shiftKey && !e.altKey && hasFinePointer()) {
              e.preventDefault();
              if (!active && text.trim()) submit();
            }
          }}
        />
        <button
          type="button"
          className={`send-btn ${mode}`}
          onClick={submit}
          aria-label={mode === "stop" ? "Stop generating" : mode === "continue" ? "Continue reply" : "Send"}
        >
          {mode === "stop" ? <IconStop /> : mode === "continue" ? <IconPlay size={16} /> : <IconArrowUp />}
        </button>
      </div>
      <p className="composer-hint" aria-hidden="true">
        Enter to send · Shift+Enter for a new line
        {mode === "continue" ? " · empty message asks the model to continue" : ""}
      </p>
    </div>
  );
}

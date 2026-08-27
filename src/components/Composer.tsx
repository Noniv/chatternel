import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { sendMessage, stopStream } from "../lib/engine";
import { imageFilesFrom } from "../lib/images";
import { useStreamActive } from "../state/streamStore";
import { AttachmentStrip, useAttachments } from "./attachments";
import { IconArrowUp, IconPlay, IconPlus, IconStop } from "./Icons";

const MAX_INPUT_HEIGHT = 160;

function hasFinePointer() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export function Composer({ convoId }: { convoId: string }) {
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const attachments = useAttachments();
  const active = useStreamActive();
  const ref = useRef<HTMLTextAreaElement>(null);

  const { clear } = attachments;
  useEffect(() => {
    clear();
    const timer = window.setTimeout(() => ref.current?.focus(), 250);
    return () => window.clearTimeout(timer);
  }, [convoId, clear]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, MAX_INPUT_HEIGHT) + "px";
  }, [text]);

  const mode = active ? "stop" : text.trim() || attachments.images.length ? "send" : "continue";

  const submit = () => {
    if (active) {
      stopStream();
      return;
    }
    if (attachments.loading) return;
    if (sendMessage(text, attachments.urls())) {
      setText("");
      attachments.clear();
    }
  };

  return (
    <div className="composer">
      <div
        className={`composer-card${dragging ? " dropping" : ""}`}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragging(false);
        }}
        onDrop={(e) => {
          const files = imageFilesFrom(e.dataTransfer);
          if (e.dataTransfer.types.includes("Files")) e.preventDefault();
          setDragging(false);
          void attachments.addFiles(files);
        }}
      >
        <AttachmentStrip images={attachments.images} onRemove={attachments.remove} />

        <div className="composer-row">
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
            onPaste={(e) => {
              const files = imageFilesFrom(e.clipboardData);
              if (files.length === 0) return;
              e.preventDefault();
              void attachments.addFiles(files);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                submit();
                return;
              }
              if (!e.shiftKey && !e.altKey && hasFinePointer()) {
                e.preventDefault();
                if (mode === "send") submit();
              }
            }}
          />

          {attachments.picker}
          <button
            type="button"
            className="attach-btn"
            onClick={attachments.openPicker}
            disabled={active || attachments.loading}
            aria-label="Attach images"
            title="Attach images"
          >
            <IconPlus size={20} />
          </button>

          <button
            type="button"
            className={`send-btn ${mode}`}
            onClick={submit}
            disabled={attachments.loading && !active}
            aria-label={mode === "stop" ? "Stop generating" : mode === "continue" ? "Continue reply" : "Send"}
          >
            {mode === "stop" ? <IconStop /> : mode === "continue" ? <IconPlay size={16} /> : <IconArrowUp />}
          </button>
        </div>
      </div>
      <p className="composer-hint" aria-hidden="true">
        Enter to send · Shift+Enter for a new line · + or paste to attach an image
        {mode === "continue" ? " · empty message asks the model to continue" : ""}
      </p>
    </div>
  );
}

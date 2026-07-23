import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import { regenerateFrom, resendUserEdit } from "../lib/engine";
import { stripHiddenBlocks } from "../lib/hiddenBlocks";
import { appActions, useAppState } from "../state/appStore";
import { toast } from "../state/toastStore";
import type { StreamState } from "../state/streamStore";
import type { Message } from "../types";
import { CopyButton } from "./CopyButton";
import { HiddenBlock } from "./HiddenBlock";
import { IconChevronLeft, IconPencil, IconRedo } from "./Icons";
import { Markdown } from "./Markdown";
import { ReasoningBlock } from "./ReasoningBlock";

function TypingDots() {
  return (
    <span className="typing" aria-label="Waiting for response">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </span>
  );
}

function EditBox({
  initial,
  saveLabel,
  onSave,
  onCancel,
}: {
  initial: string;
  saveLabel: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [draft]);

  return (
    <div className="msg-edit">
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={4}
        autoFocus
        aria-label="Edit message"
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
          if (e.key === "Enter" && e.ctrlKey) {
            e.preventDefault();
            if (draft.trim()) onSave(draft.trim());
          }
        }}
      />
      <div className="msg-edit-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => draft.trim() && onSave(draft.trim())}
        >
          {saveLabel}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

interface Props {
  msg: Message;
  index: number;
  convoId: string;
  live: StreamState | null;
}

export const MessageItem = memo(function MessageItem({ msg, index, convoId, live }: Props) {
  const [editing, setEditing] = useState(false);
  const { hiddenBlocks } = useAppState().settings;

  const streaming = live !== null;
  const rawContent = streaming ? live.content : msg.content;
  const reasoning = streaming ? live.reasoning : (msg.reasoning ?? "");
  const isUser = msg.role === "user";
  const alternatives = msg.alternatives;
  const activeIdx = msg.activeIdx ?? 0;

  // Hidden-block stripping is display-only for assistant messages; the stored
  // content and the history sent to the model keep the original markers.
  const stripped = useMemo(
    () => (isUser ? null : stripHiddenBlocks(rawContent, hiddenBlocks, { streaming })),
    [isUser, rawContent, hiddenBlocks, streaming],
  );
  const content = stripped ? stripped.content : rawContent;

  const saveEdit = (text: string) => {
    setEditing(false);
    if (isUser) {
      resendUserEdit(index, text);
    } else {
      appActions.saveAssistantEdit(convoId, index, text);
      toast("Response edited ✦");
    }
  };

  return (
    <article className={`msg ${isUser ? "user" : "assistant"}`} data-idx={index}>
      <div className="msg-meta">
        <span className="msg-role">{isUser ? "You" : "Assistant"}</span>
        <div className="msg-actions">
          {!isUser && alternatives && alternatives.length > 1 && (
            <span className="alt-pager">
              <button
                type="button"
                className="msg-act"
                aria-label="Previous version"
                disabled={streaming || activeIdx <= 0}
                onClick={() => appActions.switchAlternative(convoId, index, -1)}
              >
                <IconChevronLeft size={14} />
              </button>
              <span className="alt-count" aria-label={`Version ${activeIdx + 1} of ${alternatives.length}`}>
                {activeIdx + 1}/{alternatives.length}
              </span>
              <button
                type="button"
                className="msg-act flip"
                aria-label="Next version"
                disabled={streaming || activeIdx >= alternatives.length - 1}
                onClick={() => appActions.switchAlternative(convoId, index, 1)}
              >
                <IconChevronLeft size={14} />
              </button>
            </span>
          )}
          <CopyButton className="msg-act" getText={() => content} label="Copy message">
            {null}
          </CopyButton>
          <button
            type="button"
            className="msg-act"
            aria-label="Edit message"
            disabled={streaming}
            onClick={() => setEditing(true)}
          >
            <IconPencil size={14} />
          </button>
          {!isUser && (
            <button
              type="button"
              className="msg-act"
              aria-label="Regenerate response"
              disabled={streaming}
              onClick={() => regenerateFrom(index)}
            >
              <IconRedo size={14} />
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <EditBox
          initial={msg.content}
          saveLabel={isUser ? "Send" : "Save"}
          onSave={saveEdit}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          {!isUser && reasoning && (
            <ReasoningBlock
              text={reasoning}
              streaming={streaming}
              reasoningDone={streaming ? live.reasoningDone : true}
            />
          )}
          {stripped?.sections.map((section, i) => (
            <HiddenBlock key={i} label={section.label} text={section.text} />
          ))}
          <div className="msg-content">
            {streaming && !content ? <TypingDots /> : <Markdown text={content} />}
          </div>
        </>
      )}
    </article>
  );
});

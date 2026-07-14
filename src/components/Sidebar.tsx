import { formatDate } from "../lib/format";
import { appActions } from "../state/appStore";
import { uiActions } from "../state/uiStore";
import { PREVIEW_LENGTH, type Conversation } from "../types";
import { IconGear, IconPlus, IconSpark, IconX } from "./Icons";

function ConvoItem({ convo, active }: { convo: Conversation; active: boolean }) {
  const last = convo.messages.at(-1);
  const preview = last ? last.content.replace(/\n/g, " ").slice(0, PREVIEW_LENGTH) : "No messages yet";
  const ellipsis = last && last.content.length > PREVIEW_LENGTH ? "…" : "";

  return (
    <li className={`convo-item ${active ? "active" : ""}`}>
      <button type="button" className="convo-open" onClick={() => appActions.openConvo(convo.id)}>
        <span className="convo-title">{convo.title}</span>
        <span className="convo-preview">
          {preview}
          {ellipsis}
        </span>
      </button>
      <span className="convo-date">{formatDate(convo.updatedAt)}</span>
      <button
        type="button"
        className="convo-del"
        aria-label={`Delete "${convo.title}"`}
        onClick={() => appActions.deleteConvo(convo.id)}
      >
        <IconX size={14} />
      </button>
    </li>
  );
}

export function Sidebar({
  conversations,
  activeId,
}: {
  conversations: Conversation[];
  activeId: string | null;
}) {
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="brand">
          <IconSpark size={20} className="brand-glyph" />
          <div className="brand-text">
            <span className="brand-name">Chatternel</span>
            <span className="brand-sub">LLM frontend</span>
          </div>
        </div>
        <button type="button" className="icon-btn" aria-label="Settings" onClick={uiActions.openSettings}>
          <IconGear size={19} />
        </button>
      </div>

      <div className="sidebar-new">
        <button type="button" className="btn btn-primary btn-full" onClick={appActions.newConvo}>
          <IconPlus size={15} />
          New chat
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="sidebar-empty">
          <IconSpark size={34} className="empty-glyph" />
          <p>
            No conversations yet.
            <br />
            Start a <em>new chat</em> to begin.
          </p>
        </div>
      ) : (
        <ul className="convo-list">
          {sorted.map((convo) => (
            <ConvoItem key={convo.id} convo={convo} active={convo.id === activeId} />
          ))}
        </ul>
      )}
    </aside>
  );
}

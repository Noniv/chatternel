import { IconGear, IconSpark } from "./Icons";

/**
 * Stand-in for the sidebar and chat pane while the database is being read.
 * It fades in only after a short delay (see .boot in app.css), so a fast load
 * shows nothing at all rather than a flicker — and it never shows the "no
 * conversations yet" empty state, which would be a lie until the read is done.
 */
export function SidebarSkeleton() {
  return (
    <aside className="sidebar" aria-busy="true" aria-label="Loading conversations">
      <div className="sidebar-head">
        <div className="brand">
          <IconSpark size={20} className="brand-glyph" />
          <div className="brand-text">
            <span className="brand-name">Chatternel</span>
            <span className="brand-sub">LLM frontend</span>
          </div>
        </div>
        <span className="icon-btn boot-dim" aria-hidden="true">
          <IconGear size={19} />
        </span>
      </div>

      <div className="boot">
        <div className="sidebar-new">
          <div className="skel skel-btn" />
        </div>
        <ul className="convo-list boot-list">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="boot-row" style={{ opacity: 1 - i * 0.22 }}>
              <div className="skel skel-line wide" />
              <div className="skel skel-line" />
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export function PaneSkeleton() {
  return (
    <div className="empty-pane boot" aria-busy="true">
      <IconSpark size={42} className="empty-glyph boot-glyph" />
      <p className="boot-note">Opening your conversations…</p>
    </div>
  );
}

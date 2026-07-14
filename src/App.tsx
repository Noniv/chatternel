import type { CSSProperties } from "react";
import { appActions } from "./state/appStore";
import { PANE_SLIDE_MS, useNav } from "./state/nav";
import { ChatView } from "./components/ChatView";
import { Sidebar } from "./components/Sidebar";
import { SettingsDialog } from "./components/SettingsDialog";
import { SummaryDialog } from "./components/SummaryDialog";
import { Toast } from "./components/Toast";
import { IconPlus, IconSpark } from "./components/Icons";

function EmptyPane() {
  return (
    <div className="empty-pane">
      <IconSpark size={42} className="empty-glyph" />
      <p>Select a conversation,
        <br />
        or start a fresh one.</p>
      <button type="button" className="btn btn-primary" onClick={appActions.newConvo}>
        <IconPlus size={15} />
        New chat
      </button>
    </div>
  );
}

export default function App() {
  const { chatOpen, paneConvo, listConvos, listActiveId } = useNav();

  return (
    <div
      className={`app ${chatOpen ? "chat-open" : ""}`}
      style={{ "--pane-slide": `${PANE_SLIDE_MS}ms` } as CSSProperties}
    >
      <Sidebar conversations={listConvos} activeId={listActiveId} />
      <main className="chatpane">
        {paneConvo ? <ChatView key={paneConvo.id} convo={paneConvo} /> : <EmptyPane />}
      </main>
      <SettingsDialog />
      <SummaryDialog />
      <Toast />
    </div>
  );
}

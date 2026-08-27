import type { CSSProperties } from "react";
import { appActions, useHydrated } from "./state/appStore";
import { PANE_SLIDE_MS, useNav } from "./state/nav";
import { PaneSkeleton, SidebarSkeleton } from "./components/BootSkeleton";
import { ChatView } from "./components/ChatView";
import { Lightbox } from "./components/Lightbox";
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
  const hydrated = useHydrated();

  return (
    <div
      className={`app ${chatOpen ? "chat-open" : ""} ${hydrated ? "ready" : "booting"}`}
      style={{ "--pane-slide": `${PANE_SLIDE_MS}ms` } as CSSProperties}
    >
      {hydrated ? <Sidebar conversations={listConvos} activeId={listActiveId} /> : <SidebarSkeleton />}
      <main className="chatpane">
        {!hydrated ? (
          <PaneSkeleton />
        ) : paneConvo ? (
          <ChatView key={paneConvo.id} convo={paneConvo} />
        ) : (
          <EmptyPane />
        )}
      </main>
      <Lightbox />
      <SettingsDialog />
      <SummaryDialog />
      <Toast />
    </div>
  );
}

import { useAppState } from "./state/appStore";
import { appActions } from "./state/appStore";
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
  const { conversations, currentId } = useAppState();
  const convo = conversations.find((c) => c.id === currentId) ?? null;

  return (
    <div className={`app ${convo ? "chat-open" : ""}`}>
      <Sidebar />
      <main className="chatpane">
        {convo ? <ChatView key={convo.id} convo={convo} /> : <EmptyPane />}
      </main>
      <SettingsDialog />
      <SummaryDialog />
      <Toast />
    </div>
  );
}

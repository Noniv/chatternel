import { useSyncExternalStore } from "react";
import { loadStore, persistStore, uuid } from "../lib/storage";
import { TITLE_LENGTH, type Conversation, type Message, type Settings, type StoreData } from "../types";

let state: StoreData = loadStore();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function set(next: StoreData): void {
  state = next;
  persistStore(state);
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAppState(): StoreData {
  return state;
}

export function useAppState(): StoreData {
  return useSyncExternalStore(subscribe, getAppState);
}

export function getCurrentConvo(): Conversation | null {
  return state.conversations.find((c) => c.id === state.currentId) ?? null;
}

function updateConvo(id: string, fn: (convo: Conversation) => Conversation): void {
  set({
    ...state,
    conversations: state.conversations.map((c) => (c.id === id ? fn(c) : c)),
  });
}

function updateMessage(convo: Conversation, index: number, fn: (msg: Message) => Message): Conversation {
  return {
    ...convo,
    messages: convo.messages.map((m, i) => (i === index ? fn(m) : m)),
    updatedAt: Date.now(),
  };
}

export const appActions = {
  saveSettings(settings: Settings): void {
    set({ ...state, settings });
  },

  importData(data: StoreData): void {
    set(data);
  },

  newConvo(): void {
    const now = Date.now();
    const id = uuid();
    set({
      ...state,
      currentId: id,
      conversations: [
        ...state.conversations,
        { id, title: "New Chat", messages: [], createdAt: now, updatedAt: now },
      ],
    });
  },

  openConvo(id: string): void {
    set({ ...state, currentId: id });
  },

  goHome(): void {
    set({ ...state, currentId: null });
  },

  deleteConvo(id: string): void {
    set({
      ...state,
      conversations: state.conversations.filter((c) => c.id !== id),
      currentId: state.currentId === id ? null : state.currentId,
    });
  },

  setTitle(convoId: string, title: string): void {
    updateConvo(convoId, (c) => ({ ...c, title: title.trim() || "New Chat" }));
  },

  appendUserMessage(convoId: string, content: string): void {
    updateConvo(convoId, (c) => {
      const title =
        c.messages.length === 0
          ? content.slice(0, TITLE_LENGTH) + (content.length > TITLE_LENGTH ? "…" : "")
          : c.title;
      return {
        ...c,
        title,
        messages: [...c.messages, { role: "user", content }],
        updatedAt: Date.now(),
      };
    });
  },

  appendAssistantPlaceholder(convoId: string): void {
    updateConvo(convoId, (c) => ({
      ...c,
      messages: [...c.messages, { role: "assistant", content: "", reasoning: "" }],
      updatedAt: Date.now(),
    }));
  },

  truncateTo(convoId: string, length: number): void {
    updateConvo(convoId, (c) => ({
      ...c,
      messages: c.messages.slice(0, length),
      updatedAt: Date.now(),
    }));
  },

  saveUserEdit(convoId: string, index: number, content: string): void {
    updateConvo(convoId, (c) => ({
      ...c,
      messages: [...c.messages.slice(0, index), { ...c.messages[index], content }],
      updatedAt: Date.now(),
    }));
  },

  saveAssistantEdit(convoId: string, index: number, content: string): void {
    updateConvo(convoId, (c) =>
      updateMessage(c, index, (m) => {
        const next: Message = { ...m, content };
        if (next.alternatives && next.activeIdx !== undefined) {
          next.alternatives = next.alternatives.map((alt, i) =>
            i === next.activeIdx ? { content, reasoning: m.reasoning ?? "" } : alt,
          );
        }
        return next;
      }),
    );
  },

  prepareRegen(convoId: string, index: number): void {
    updateConvo(convoId, (c) =>
      updateMessage(c, index, (m) => {
        const alternatives = m.alternatives
          ? [...m.alternatives]
          : [{ content: m.content, reasoning: m.reasoning ?? "" }];
        alternatives.push({ content: "", reasoning: "" });
        return {
          ...m,
          alternatives,
          activeIdx: alternatives.length - 1,
          content: "",
          reasoning: "",
        };
      }),
    );
  },

  finalizeAssistant(convoId: string, index: number, content: string, reasoning: string): void {
    updateConvo(convoId, (c) =>
      updateMessage(c, index, (m) => {
        const next: Message = { ...m, content, reasoning };
        if (next.alternatives && next.activeIdx !== undefined) {
          next.alternatives = next.alternatives.map((alt, i) =>
            i === next.activeIdx ? { content, reasoning } : alt,
          );
        }
        return next;
      }),
    );
  },

  switchAlternative(convoId: string, index: number, dir: -1 | 1): void {
    updateConvo(convoId, (c) =>
      updateMessage(c, index, (m) => {
        if (!m.alternatives || m.activeIdx === undefined) return m;
        const nextIdx = m.activeIdx + dir;
        if (nextIdx < 0 || nextIdx >= m.alternatives.length) return m;
        const alt = m.alternatives[nextIdx];
        return { ...m, activeIdx: nextIdx, content: alt.content, reasoning: alt.reasoning };
      }),
    );
  },

  setSummary(convoId: string, summary: string): void {
    updateConvo(convoId, (c) => ({ ...c, summary, updatedAt: Date.now() }));
  },

  applySummary(convoId: string, summary: string, keepCount: number): void {
    updateConvo(convoId, (c) => ({
      ...c,
      summary,
      messages: keepCount > 0 ? c.messages.slice(-keepCount) : [],
      updatedAt: Date.now(),
    }));
  },
};

import { useSyncExternalStore } from "react";
import { loadAll, writeChanges } from "../lib/db";
import { uuid } from "../lib/storage";
import { toast } from "./toastStore";
import {
  DEFAULT_SETTINGS,
  TITLE_LENGTH,
  type Conversation,
  type Message,
  type Settings,
  type StoreData,
} from "../types";

let state: StoreData = { settings: { ...DEFAULT_SETTINGS }, conversations: [], currentId: null };
/** False until the database has been read, and permanently false if reading failed. */
let persisting = false;
let hydrated = false;
let writeWarned = false;

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

async function persist(next: StoreData, prev: StoreData): Promise<void> {
  try {
    await writeChanges(next, prev);
    writeWarned = false;
  } catch {
    if (writeWarned) return;
    writeWarned = true;
    toast("Couldn't save that change — your browser refused the write. Export a backup to be safe.");
  }
}

function set(next: StoreData): void {
  const prev = state;
  state = next;
  emit();
  // Writing before hydration would overwrite stored data with the empty
  // starting state; writing after a failed load would do the same.
  if (persisting) void persist(next, prev);
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

/** True once the stored data has been read and the UI can be shown. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => hydrated);
}

let hydration: Promise<void> | null = null;

export function hydrate(): Promise<void> {
  if (!hydration) hydration = run();
  return hydration;
}

async function run(): Promise<void> {
  try {
    const data = await loadAll();
    state = { settings: data.settings, conversations: data.conversations, currentId: null };
    persisting = true;
  } catch {
    // Reading failed, so we have no idea what is stored: never write, or we
    // would replace real conversations with this empty session.
    toast("Couldn't open local storage — this session won't be saved.");
  }
  hydrated = true;
  emit();
}

// Starts as soon as the app is imported, before React renders anything.
void hydrate();

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

  appendUserMessage(convoId: string, content: string, images?: string[]): void {
    updateConvo(convoId, (c) => {
      const label = content || (images?.length ? "Image" : "");
      const title =
        c.messages.length === 0
          ? label.slice(0, TITLE_LENGTH) + (label.length > TITLE_LENGTH ? "…" : "")
          : c.title;
      const msg: Message = { role: "user", content };
      if (images?.length) msg.images = images;
      return {
        ...c,
        title,
        messages: [...c.messages, msg],
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

  saveUserEdit(convoId: string, index: number, content: string, images?: string[]): void {
    updateConvo(convoId, (c) => {
      const msg: Message = { ...c.messages[index], content };
      // `images` omitted means "leave the attachments alone"; an empty array clears them.
      if (images) {
        if (images.length) msg.images = images;
        else delete msg.images;
      }
      return {
        ...c,
        messages: [...c.messages.slice(0, index), msg],
        updatedAt: Date.now(),
      };
    });
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

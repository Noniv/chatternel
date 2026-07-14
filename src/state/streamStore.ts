import { useSyncExternalStore } from "react";

export interface StreamState {
  active: boolean;
  convoId: string | null;
  index: number;
  content: string;
  reasoning: string;
  reasoningDone: boolean;
}

const IDLE: StreamState = {
  active: false,
  convoId: null,
  index: -1,
  content: "",
  reasoning: "",
  reasoningDone: false,
};

let snapshot: StreamState = IDLE;
let pending: StreamState | null = null;
let rafId = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function flush(): void {
  rafId = 0;
  if (pending) {
    snapshot = pending;
    pending = null;
    emit();
  }
}

function cancelPending(): void {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  pending = null;
}

export const streamStore = {
  get(): StreamState {
    return pending ?? snapshot;
  },
  start(convoId: string, index: number): void {
    cancelPending();
    snapshot = { active: true, convoId, index, content: "", reasoning: "", reasoningDone: false };
    emit();
  },
  push(patch: Partial<StreamState>): void {
    pending = { ...(pending ?? snapshot), ...patch };
    if (!rafId) rafId = requestAnimationFrame(flush);
  },
  end(): void {
    cancelPending();
    snapshot = IDLE;
    emit();
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useStream(): StreamState {
  return useSyncExternalStore(streamStore.subscribe, () => snapshot);
}

export function useStreamActive(): boolean {
  return useSyncExternalStore(streamStore.subscribe, () => snapshot.active);
}

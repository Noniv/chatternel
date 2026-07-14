import { useSyncExternalStore } from "react";

export type SummaryMode = null | "create" | "view";

export interface UiState {
  settingsOpen: boolean;
  summaryMode: SummaryMode;
}

let state: UiState = { settingsOpen: false, summaryMode: null };
const listeners = new Set<() => void>();

function set(patch: Partial<UiState>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUi(): UiState {
  return useSyncExternalStore(subscribe, () => state);
}

export const uiActions = {
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  openSummary: (mode: Exclude<SummaryMode, null>) => set({ summaryMode: mode, settingsOpen: false }),
  closeSummary: () => set({ summaryMode: null }),
};

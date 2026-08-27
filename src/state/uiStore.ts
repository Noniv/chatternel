import { useSyncExternalStore } from "react";

export type SummaryMode = null | "create" | "view";

/** The full-size image viewer: every image of one message, plus the one on show. */
export interface LightboxState {
  images: string[];
  index: number;
}

export interface UiState {
  settingsOpen: boolean;
  summaryMode: SummaryMode;
  lightbox: LightboxState | null;
}

let state: UiState = { settingsOpen: false, summaryMode: null, lightbox: null };
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
  openLightbox: (images: string[], index: number) => set({ lightbox: { images, index } }),
  closeLightbox: () => set({ lightbox: null }),
  stepLightbox(dir: -1 | 1): void {
    const open = state.lightbox;
    if (!open) return;
    const next = open.index + dir;
    if (next < 0 || next >= open.images.length) return;
    set({ lightbox: { ...open, index: next } });
  },
};

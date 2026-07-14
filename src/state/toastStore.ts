import { useSyncExternalStore } from "react";

export interface ToastState {
  message: string;
  key: number;
}

let state: ToastState = { message: "", key: 0 };
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function toast(message: string): void {
  state = { message, key: state.key + 1 };
  for (const listener of listeners) listener();
}

export function useToast(): ToastState {
  return useSyncExternalStore(subscribe, () => state);
}

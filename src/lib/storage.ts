import { DEFAULT_SETTINGS, type StoreData } from "../types";

const STORAGE_KEY = "chatternel";

export function loadStore(): StoreData {
  const base: StoreData = { settings: { ...DEFAULT_SETTINGS }, conversations: [], currentId: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const data = JSON.parse(raw);
    return {
      settings: { ...DEFAULT_SETTINGS, ...data.settings },
      conversations: data.conversations ?? [],
      currentId: null,
    };
  } catch {
    return base;
  }
}

export function persistStore(data: StoreData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage full or unavailable — nothing we can do
  }
}

export function exportStore(data: StoreData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `chatternel-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function parseBackup(text: string, current: StoreData): StoreData {
  const data = JSON.parse(text);
  return {
    settings: { ...DEFAULT_SETTINGS, ...data.settings },
    conversations: data.conversations ?? current.conversations,
    currentId: data.currentId ?? null,
  };
}

export function uuid(): string {
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

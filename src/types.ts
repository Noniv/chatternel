export type Role = "user" | "assistant";

export interface Alternative {
  content: string;
  reasoning: string;
}

export interface Message {
  role: Role;
  content: string;
  reasoning?: string;
  alternatives?: Alternative[];
  activeIdx?: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  summary?: string;
}

export type ReasoningEffort = "" | "none" | "minimal" | "low" | "medium" | "high" | "xhigh";

export interface Settings {
  apiKey: string;
  modelId: string;
  systemPrompt: string;
  temperature: number;
  topP: number;
  provider: string;
  noFallbacks: boolean;
  reasoningEffort: ReasoningEffort;
  reasoningTokens: string;
  reasoningCollapsedByDefault: boolean;
}

export interface StoreData {
  settings: Settings;
  conversations: Conversation[];
  currentId: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  modelId: "xiaomi/mimo-v2.5-pro",
  systemPrompt: "You are a helpful assistant.",
  temperature: 1.0,
  topP: 1.0,
  provider: "",
  noFallbacks: false,
  reasoningEffort: "",
  reasoningTokens: "",
  reasoningCollapsedByDefault: true,
};

export const MIN_REASONING_TOKENS = 1024;
export const TITLE_LENGTH = 45;
export const PREVIEW_LENGTH = 65;

export type Role = "user" | "assistant";

export interface Alternative {
  content: string;
  reasoning: string;
}

export interface Message {
  role: Role;
  content: string;
  /** Image attachments as base64 data URLs, sent as `image_url` content parts. */
  images?: string[];
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

/**
 * A display-only rule for hiding a region of assistant output behind an
 * expandable block (like reasoning). The matched text is never removed from the
 * stored message or from the history sent to the model — only from what's shown.
 */
export interface HiddenBlockRule {
  id: string;
  label: string;
  /** Literal text that begins the hidden region. */
  start: string;
  /** Literal text that ends it (inclusive). Blank = strip to end of the line. */
  end: string;
  enabled: boolean;
}

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
  hiddenBlocks: HiddenBlockRule[];
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
  hiddenBlocks: [],
};

export const MIN_REASONING_TOKENS = 1024;
export const TITLE_LENGTH = 45;
export const PREVIEW_LENGTH = 65;

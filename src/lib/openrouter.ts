import { DEFAULT_SETTINGS, MIN_REASONING_TOKENS, type Conversation, type Message, type Settings } from "../types";

export const API_URL = "https://openrouter.ai/api/v1/chat/completions";

function headers(apiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer": location.href,
    "X-Title": "Chatternel",
  };
}

type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

/**
 * Messages without images stay plain strings. With images we switch to the
 * multimodal content array OpenRouter documents: the text part first, then one
 * `image_url` part per image.
 */
function messageContent(msg: Message): string | ContentPart[] {
  if (!msg.images || msg.images.length === 0) return msg.content;
  const parts: ContentPart[] = [];
  if (msg.content) parts.push({ type: "text", text: msg.content });
  for (const url of msg.images) parts.push({ type: "image_url", image_url: { url } });
  return parts;
}

export function buildRequestBody(settings: Settings, convo: Conversation, endIdx: number): Record<string, unknown> {
  const history = convo.messages
    .slice(0, endIdx)
    .map((msg) => ({ role: msg.role, content: messageContent(msg) }));

  let systemContent = settings.systemPrompt || "";
  if (convo.summary) {
    const base = systemContent.trimEnd();
    systemContent =
      base +
      (base ? "\n\n" : "") +
      "---\nConversation Summary (context from earlier in this conversation):\n" +
      convo.summary;
  }

  const messages = systemContent ? [{ role: "system", content: systemContent }, ...history] : history;

  const body: Record<string, unknown> = {
    model: settings.modelId || DEFAULT_SETTINGS.modelId,
    stream: true,
    messages,
    cache_control: { type: "ephemeral" },
  };

  const temp = settings.temperature ?? 1.0;
  const topP = settings.topP ?? 1.0;
  if (Math.abs(temp - 1.0) > 1e-6) body.temperature = temp;
  if (Math.abs(topP - 1.0) > 1e-6) body.top_p = topP;

  if (settings.provider) {
    body.provider = { order: [settings.provider], allow_fallbacks: !settings.noFallbacks };
  }

  const tokens = parseInt(settings.reasoningTokens, 10);
  const hasTokens = !!settings.reasoningTokens && tokens >= MIN_REASONING_TOKENS;
  if (settings.reasoningEffort || hasTokens) {
    body.reasoning = hasTokens ? { max_tokens: tokens } : { effort: settings.reasoningEffort };
  }
  return body;
}

interface StreamDelta {
  content: string;
  reasoning: string;
}

function parseStreamLine(line: string): StreamDelta | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const data = trimmed.slice(5).trim();
  if (data === "[DONE]") return null;
  try {
    const delta = JSON.parse(data).choices?.[0]?.delta;
    return { content: delta?.content ?? "", reasoning: delta?.reasoning ?? "" };
  } catch {
    return null;
  }
}

async function extractError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.error?.message || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

function partialTagSuffix(buf: string, tag: string): number {
  const max = Math.min(tag.length - 1, buf.length);
  for (let i = max; i > 0; i--) {
    if (buf.endsWith(tag.slice(0, i))) return i;
  }
  return 0;
}

class ThinkTagParser {
  content = "";
  reasoning = "";
  inside = false;
  private buf = "";

  push(text: string): void {
    this.buf += text;
    while (this.buf.length > 0) {
      if (!this.inside) {
        const idx = this.buf.indexOf("<think>");
        if (idx !== -1) {
          this.content += this.buf.slice(0, idx);
          this.buf = this.buf.slice(idx + 7);
          this.inside = true;
        } else {
          const keep = partialTagSuffix(this.buf, "<think>");
          this.content += this.buf.slice(0, this.buf.length - keep);
          this.buf = this.buf.slice(this.buf.length - keep);
          break;
        }
      } else {
        const idx = this.buf.indexOf("</think>");
        if (idx !== -1) {
          this.reasoning += this.buf.slice(0, idx);
          this.buf = this.buf.slice(idx + 8);
          this.inside = false;
        } else {
          const keep = partialTagSuffix(this.buf, "</think>");
          this.reasoning += this.buf.slice(0, this.buf.length - keep);
          this.buf = this.buf.slice(this.buf.length - keep);
          break;
        }
      }
    }
  }

  flush(): void {
    if (!this.buf) return;
    if (this.inside) this.reasoning += this.buf;
    else this.content += this.buf;
    this.buf = "";
  }
}

export interface ChatStreamUpdate {
  content: string;
  reasoning: string;
  reasoningDone: boolean;
}

export interface ChatStreamResult {
  content: string;
  reasoning: string;
  errored: boolean;
  errorMessage?: string;
}

async function readSse(
  response: Response,
  onDelta: (delta: StreamDelta) => void,
): Promise<void> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop()!;
    for (const line of lines) {
      const delta = parseStreamLine(line);
      if (delta) onDelta(delta);
    }
  }
}

export async function runChatStream(opts: {
  apiKey: string;
  body: unknown;
  signal: AbortSignal;
  onUpdate: (update: ChatStreamUpdate) => void;
}): Promise<ChatStreamResult> {
  const parser = new ThinkTagParser();
  let errored = false;
  let errorMessage: string | undefined;

  const emit = () =>
    opts.onUpdate({
      content: parser.content,
      reasoning: parser.reasoning,
      reasoningDone: !parser.inside && parser.content.length > 0,
    });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: headers(opts.apiKey),
      body: JSON.stringify(opts.body),
      signal: opts.signal,
    });
    if (!response.ok) throw new Error(await extractError(response));

    await readSse(response, (delta) => {
      if (delta.reasoning) parser.reasoning += delta.reasoning;
      if (delta.content) parser.push(delta.content);
      emit();
    });
    parser.flush();
    emit();
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      errored = true;
      errorMessage = (err as Error).message;
    }
  }

  return { content: parser.content, reasoning: parser.reasoning, errored, errorMessage };
}

export async function runPlainStream(opts: {
  apiKey: string;
  body: unknown;
  signal: AbortSignal;
  onText: (text: string) => void;
}): Promise<{ text: string; errored: boolean; errorMessage?: string; aborted: boolean }> {
  let text = "";
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: headers(opts.apiKey),
      body: JSON.stringify(opts.body),
      signal: opts.signal,
    });
    if (!response.ok) throw new Error(await extractError(response));

    await readSse(response, (delta) => {
      if (delta.content) {
        text += delta.content;
        opts.onText(text);
      }
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      return { text, errored: false, aborted: true };
    }
    return { text, errored: true, errorMessage: (err as Error).message, aborted: false };
  }
  return { text, errored: false, aborted: false };
}

import { appActions, getAppState, getCurrentConvo } from "../state/appStore";
import { streamStore } from "../state/streamStore";
import { toast } from "../state/toastStore";
import { uiActions } from "../state/uiStore";
import { DEFAULT_SETTINGS } from "../types";
import { markNoVision, supportsImages } from "./models";
import { buildRequestBody, historyHasImages, runChatStream } from "./openrouter";

let controller: AbortController | null = null;

export function stopStream(): void {
  controller?.abort();
}

/** A 4xx that isn't about auth, credits or rate limits — what an unsupported image input looks like. */
function mayBeImageRejection(status?: number): boolean {
  return !!status && status >= 400 && status < 500 && ![401, 402, 403, 429].includes(status);
}

export function sendMessage(text: string, images: string[] = []): boolean {
  if (streamStore.get().active) {
    stopStream();
    return false;
  }
  if (!getAppState().settings.apiKey) {
    toast("Set your API key in settings first.");
    uiActions.openSettings();
    return false;
  }
  const convo = getCurrentConvo();
  if (!convo) return false;

  const trimmed = text.trim();
  // An empty message with no images is the "continue the reply" shortcut.
  const content = trimmed || (images.length ? "" : "Continue.");
  appActions.appendUserMessage(convo.id, content, images);
  void generate(null);
  return true;
}

export async function generate(targetIndex: number | null): Promise<void> {
  if (streamStore.get().active) return;

  const convo = getCurrentConvo();
  if (!convo) return;
  const { settings } = getAppState();
  if (!settings.apiKey) {
    toast("API key missing.");
    return;
  }

  let index: number;
  if (targetIndex !== null) {
    index = targetIndex;
    appActions.prepareRegen(convo.id, index);
  } else {
    index = convo.messages.length;
    appActions.appendAssistantPlaceholder(convo.id);
  }

  streamStore.start(convo.id, index);
  controller = new AbortController();
  const { signal } = controller;

  const fresh = getAppState().conversations.find((c) => c.id === convo.id);
  if (!fresh) {
    streamStore.end();
    controller = null;
    return;
  }
  const modelId = settings.modelId || DEFAULT_SETTINGS.modelId;
  let withImages = historyHasImages(fresh, index) && supportsImages(modelId) !== false;

  const run = () =>
    runChatStream({
      apiKey: settings.apiKey,
      body: buildRequestBody(settings, fresh, index, withImages),
      signal,
      onUpdate: (update) => streamStore.push(update),
    });

  let result = await run();

  // Models missing from the catalog (or a pinned provider without vision) only
  // tell us by rejecting the request — retry once with the images left out.
  if (withImages && result.errored && !result.content && mayBeImageRejection(result.status)) {
    withImages = false;
    const retry = await run();
    if (!retry.errored && !signal.aborted) {
      markNoVision(modelId);
      toast("This model can't view images — sent the chat without them.");
    }
    if (!retry.errored || retry.content) result = retry;
  }

  controller = null;

  const fallback = result.errored ? "[Error — check your API key and model ID]" : "[No response]";
  appActions.finalizeAssistant(convo.id, index, result.content || fallback, result.reasoning);
  streamStore.end();

  if (result.errored && result.errorMessage) {
    toast("Error: " + result.errorMessage);
  }
}

export function regenerateFrom(index: number): void {
  const convo = getCurrentConvo();
  if (!convo || streamStore.get().active) return;
  appActions.truncateTo(convo.id, index + 1);
  void generate(index);
}

export function resendUserEdit(index: number, content: string, images?: string[]): void {
  const convo = getCurrentConvo();
  if (!convo || streamStore.get().active) return;
  appActions.saveUserEdit(convo.id, index, content, images);
  void generate(null);
}

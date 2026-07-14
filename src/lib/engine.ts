import { appActions, getAppState, getCurrentConvo } from "../state/appStore";
import { streamStore } from "../state/streamStore";
import { toast } from "../state/toastStore";
import { uiActions } from "../state/uiStore";
import { buildRequestBody, runChatStream } from "./openrouter";

let controller: AbortController | null = null;

export function stopStream(): void {
  controller?.abort();
}

export function sendMessage(text: string): boolean {
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

  const content = text.trim() || "Continue.";
  appActions.appendUserMessage(convo.id, content);
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

  const fresh = getAppState().conversations.find((c) => c.id === convo.id);
  if (!fresh) {
    streamStore.end();
    controller = null;
    return;
  }
  const body = buildRequestBody(settings, fresh, index);

  const result = await runChatStream({
    apiKey: settings.apiKey,
    body,
    signal: controller.signal,
    onUpdate: (update) => streamStore.push(update),
  });

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

export function resendUserEdit(index: number, content: string): void {
  const convo = getCurrentConvo();
  if (!convo || streamStore.get().active) return;
  appActions.saveUserEdit(convo.id, index, content);
  void generate(null);
}

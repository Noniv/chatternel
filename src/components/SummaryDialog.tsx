import { useEffect, useRef, useState } from "react";
import { runPlainStream } from "../lib/openrouter";
import { appActions, getAppState, getCurrentConvo } from "../state/appStore";
import { toast } from "../state/toastStore";
import { uiActions, useUi } from "../state/uiStore";
import { DEFAULT_SETTINGS } from "../types";
import { Modal } from "./Modal";

const DEFAULT_SUMM_PROMPT = `Please create a detailed summary of this conversation to use as context in future sessions. Cover:
- The main topics, questions, and goals discussed
- Key decisions, conclusions, and answers reached
- Important facts, code, or technical details mentioned
- Anything a future session would need to continue seamlessly

Be thorough but concise. Write in third person as context for an AI assistant.`;

const STEP_TITLES: Record<number, string> = {
  1: "Summarise conversation",
  2: "Review summary",
  3: "Current summary",
};

export function SummaryDialog() {
  const { summaryMode } = useUi();
  const open = summaryMode !== null;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [prompt, setPrompt] = useState(DEFAULT_SUMM_PROMPT);
  const [keep, setKeep] = useState("2");
  const [result, setResult] = useState("");
  const [viewText, setViewText] = useState("");
  const [generating, setGenerating] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (summaryMode === "create") {
      setPrompt(DEFAULT_SUMM_PROMPT);
      setResult("");
      setKeep("2");
      setStep(1);
    } else if (summaryMode === "view") {
      setViewText(getCurrentConvo()?.summary ?? "");
      setStep(3);
    }
  }, [summaryMode]);

  const close = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    uiActions.closeSummary();
  };

  const runGeneration = async () => {
    const convo = getCurrentConvo();
    if (!convo) return;
    const { settings } = getAppState();
    if (!settings.apiKey) {
      toast("API key missing.");
      return;
    }
    const instruction = prompt.trim();
    if (!instruction) return;

    setStep(2);
    setResult("");
    setGenerating(true);

    const convoText = convo.messages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n\n");

    const userContent = convo.summary
      ? `Previous summary (incorporate and update this with the new conversation below):\n---\n${convo.summary}\n---\n\nNew conversation to integrate:\n---\n${convoText}`
      : convoText;

    const body: Record<string, unknown> = {
      model: settings.modelId || DEFAULT_SETTINGS.modelId,
      stream: true,
      temperature: 0.5,
      messages: [
        { role: "system", content: instruction },
        { role: "user", content: userContent },
      ],
    };
    if (settings.provider) {
      body.provider = { order: [settings.provider], allow_fallbacks: !settings.noFallbacks };
    }

    controllerRef.current = new AbortController();
    const res = await runPlainStream({
      apiKey: settings.apiKey,
      body,
      signal: controllerRef.current.signal,
      onText: (text) => {
        setResult(text);
        const el = resultRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      },
    });
    controllerRef.current = null;
    setGenerating(false);

    if (res.errored) {
      toast("Summary error: " + res.errorMessage);
      setStep(1);
    }
  };

  const confirm = () => {
    const convo = getCurrentConvo();
    if (!convo) return;
    const text = result.trim();
    if (!text) return;
    let keepCount = parseInt(keep, 10);
    if (isNaN(keepCount) || keepCount < 0) keepCount = 0;
    appActions.applySummary(convo.id, text, keepCount);
    close();
    toast("Conversation summarised ✦");
  };

  const clearSummary = () => {
    const convo = getCurrentConvo();
    if (!convo) return;
    appActions.setSummary(convo.id, "");
    close();
    toast("Summary cleared");
  };

  const saveView = () => {
    const convo = getCurrentConvo();
    if (!convo) return;
    const text = viewText.trim();
    if (!text) {
      clearSummary();
      return;
    }
    appActions.setSummary(convo.id, text);
    close();
    toast("Summary saved ✦");
  };

  return (
    <Modal open={open} onClose={close} title={STEP_TITLES[step]}>
      <div className="summ-body">
        {step === 1 && (
          <>
            <p className="summ-hint">
              A summary will be generated using the instruction below. If a previous summary exists
              it will be passed as context so the new one incorporates everything.
            </p>
            <textarea
              className="field-textarea"
              rows={8}
              spellCheck
              aria-label="Summary instruction"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <div className="field">
              <label className="field-label" htmlFor="summ-keep">
                Messages to keep after summarising
              </label>
              <input
                id="summ-keep"
                type="number"
                className="field-input"
                min={0}
                max={50}
                step={1}
                value={keep}
                onChange={(e) => setKeep(e.target.value)}
              />
            </div>
            <div className="btn-row">
              <button type="button" className="btn btn-ghost" onClick={close}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary grow" onClick={runGeneration}>
                Generate summary →
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="summ-hint">
              Review and edit the summary below. This will <em>replace</em> any existing summary and
              is kept entirely separate from your system prompt.
            </p>
            {generating && (
              <div className="summ-generating">
                <span className="typing">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </span>
                Generating summary…
              </div>
            )}
            <textarea
              ref={resultRef}
              className="field-textarea"
              rows={12}
              spellCheck
              placeholder="Summary will appear here…"
              aria-label="Generated summary"
              value={result}
              onChange={(e) => setResult(e.target.value)}
            />
            <div className="btn-row">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm grow"
                disabled={generating}
                onClick={() => {
                  setResult("");
                  void runGeneration();
                }}
              >
                ↺ Regenerate
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm grow-2"
                disabled={generating}
                onClick={confirm}
              >
                ✓ Confirm
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <p className="summ-hint">
              This summary is automatically appended to your system prompt during the conversation,
              and fed back into the next summarisation as prior context. Edit or clear it freely.
            </p>
            <textarea
              className="field-textarea"
              rows={14}
              spellCheck
              aria-label="Current summary"
              value={viewText}
              onChange={(e) => setViewText(e.target.value)}
            />
            <div className="btn-row">
              <button type="button" className="btn btn-danger btn-sm" onClick={clearSummary}>
                ✕ Clear
              </button>
              <button type="button" className="btn btn-primary btn-sm grow" onClick={saveView}>
                Save changes
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

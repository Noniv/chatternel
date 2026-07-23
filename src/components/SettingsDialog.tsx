import { useEffect, useState } from "react";
import { exportStore, parseBackup, uuid } from "../lib/storage";
import { appActions, getAppState, useAppState } from "../state/appStore";
import { toast } from "../state/toastStore";
import { uiActions, useUi } from "../state/uiStore";
import {
  DEFAULT_SETTINGS,
  MIN_REASONING_TOKENS,
  type HiddenBlockRule,
  type ReasoningEffort,
  type Settings,
} from "../types";
import { IconExport, IconEye, IconEyeOff, IconImport, IconPlus, IconSpark, IconX } from "./Icons";
import { Modal } from "./Modal";

const EFFORT_OPTIONS: { value: ReasoningEffort; label: string }[] = [
  { value: "", label: "Auto" },
  { value: "none", label: "Off" },
  { value: "minimal", label: "Min" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Med" },
  { value: "high", label: "High" },
  { value: "xhigh", label: "Max" },
];

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="toggle-row">
      <span className="toggle-label">{label}</span>
      <input
        type="checkbox"
        className="toggle-input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true">
        <span className="toggle-thumb" />
      </span>
    </label>
  );
}

function SliderField({
  label,
  hint,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <div className="slider-row">
        <input
          type="range"
          min={min}
          max={max}
          step={0.05}
          value={value}
          aria-label={label}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <span className="slider-val">{value.toFixed(2)}</span>
      </div>
      <span className="field-hint">{hint}</span>
    </div>
  );
}

function HiddenBlocksEditor({
  rules,
  onChange,
}: {
  rules: HiddenBlockRule[];
  onChange: (rules: HiddenBlockRule[]) => void;
}) {
  const update = (id: string, patch: Partial<HiddenBlockRule>) =>
    onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const add = () =>
    onChange([...rules, { id: uuid(), label: "", start: "", end: "", enabled: true }]);

  return (
    <div className="field">
      <span className="field-label">
        Hidden blocks <span className="optional">(optional)</span>
      </span>
      <span className="field-hint">
        Fold parts of the reply into an expandable block, like reasoning. Matched text stays in the
        message and is still sent to the model — only the on-screen view is hidden. Leave “End” blank
        to hide to the end of the line.
      </span>

      {rules.map((rule) => (
        <div key={rule.id} className="hb-rule">
          <div className="hb-rule-top">
            <input
              type="text"
              className="field-input"
              placeholder="Label (e.g. Notes)"
              value={rule.label}
              onChange={(e) => update(rule.id, { label: e.target.value })}
            />
            <Toggle
              label=""
              checked={rule.enabled}
              onChange={(v) => update(rule.id, { enabled: v })}
            />
            <button
              type="button"
              className="icon-btn"
              aria-label="Remove hidden block"
              onClick={() => onChange(rules.filter((r) => r.id !== rule.id))}
            >
              <IconX size={16} />
            </button>
          </div>
          <div className="hb-rule-markers">
            <input
              type="text"
              className="field-input"
              placeholder="Start marker  <!-- META -->"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={rule.start}
              onChange={(e) => update(rule.id, { start: e.target.value })}
            />
            <input
              type="text"
              className="field-input"
              placeholder="End marker  <!-- END_META -->"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={rule.end}
              onChange={(e) => update(rule.id, { end: e.target.value })}
            />
          </div>
        </div>
      ))}

      <button type="button" className="btn btn-ghost btn-sm" onClick={add}>
        <IconPlus size={14} />
        Add hidden block
      </button>
    </div>
  );
}

function importFromFile() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const data = parseBackup(await file.text(), getAppState());
      appActions.importData(data);
      uiActions.closeSettings();
      toast("Data imported ✦");
    } catch {
      toast("Import failed — invalid file");
    }
  };
  input.click();
}

export function SettingsDialog() {
  const { settingsOpen } = useUi();
  const { currentId } = useAppState();
  const [form, setForm] = useState<Settings>(() => getAppState().settings);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (settingsOpen) {
      setForm(getAppState().settings);
      setShowKey(false);
    }
  }, [settingsOpen]);

  const patch = (p: Partial<Settings>) => setForm((f) => ({ ...f, ...p }));

  const save = () => {
    appActions.saveSettings({
      ...form,
      apiKey: form.apiKey.trim(),
      modelId: form.modelId.trim() || DEFAULT_SETTINGS.modelId,
      provider: form.provider.trim(),
      reasoningTokens: form.reasoningTokens.trim(),
    });
    uiActions.closeSettings();
    toast("Settings saved ✦");
  };

  const removeConvo = () => {
    if (!currentId) return;
    appActions.deleteConvo(currentId);
    uiActions.closeSettings();
    toast("Conversation removed");
  };

  return (
    <Modal
      open={settingsOpen}
      onClose={uiActions.closeSettings}
      title="Configuration"
      footer={
        <button type="button" className="btn btn-primary btn-full" onClick={save}>
          Save settings
        </button>
      }
    >
      <div className="settings-body">
        <div className="field">
          <span className="field-label">Backup</span>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => exportStore(getAppState())}>
              <IconExport size={14} />
              Export JSON
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={importFromFile}>
              <IconImport size={14} />
              Import JSON
            </button>
          </div>
        </div>

        <hr className="divider" />

        <div className="field">
          <label className="field-label" htmlFor="s-key">
            OpenRouter API key
          </label>
          <div className="key-row">
            <input
              id="s-key"
              type="text"
              className={`field-input ${showKey ? "" : "masked"}`}
              placeholder="sk-or-v1-…"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-1p-ignore=""
              data-lpignore="true"
              data-bwignore=""
              value={form.apiKey}
              onChange={(e) => patch({ apiKey: e.target.value })}
            />
            <button
              type="button"
              className="icon-btn"
              aria-label={showKey ? "Hide API key" : "Show API key"}
              aria-pressed={showKey}
              onClick={() => setShowKey((v) => !v)}
            >
              {showKey ? <IconEyeOff size={17} /> : <IconEye size={17} />}
            </button>
          </div>
          <span className="field-hint">From openrouter.ai — stored locally, never sent elsewhere.</span>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="s-model">
            Model ID
          </label>
          <input
            id="s-model"
            type="text"
            className="field-input"
            placeholder="anthropic/claude-opus-4"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={form.modelId}
            onChange={(e) => patch({ modelId: e.target.value })}
          />
          <span className="field-hint">e.g. openai/gpt-4o · anthropic/claude-opus-4</span>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="s-provider">
            Provider pin <span className="optional">(optional)</span>
          </label>
          <input
            id="s-provider"
            type="text"
            className="field-input"
            placeholder="e.g. DeepInfra · Together · Fireworks"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={form.provider}
            onChange={(e) => patch({ provider: e.target.value })}
          />
          <span className="field-hint">Pins requests to one provider. Blank = auto routing.</span>
          <Toggle
            label="Error if pinned provider is unavailable"
            checked={form.noFallbacks}
            onChange={(v) => patch({ noFallbacks: v })}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="s-system">
            System prompt
          </label>
          <textarea
            id="s-system"
            className="field-textarea"
            placeholder="You are a helpful assistant…"
            rows={5}
            value={form.systemPrompt}
            onChange={(e) => patch({ systemPrompt: e.target.value })}
          />
        </div>

        <SliderField
          label="Temperature"
          hint="Higher = more creative and unpredictable replies."
          min={0}
          max={2}
          value={form.temperature}
          onChange={(v) => patch({ temperature: v })}
        />

        <SliderField
          label="Top P"
          hint="Nucleus sampling diversity control. Default 1.0."
          min={0}
          max={1}
          value={form.topP}
          onChange={(v) => patch({ topP: v })}
        />

        <div className="field">
          <span className="field-label">
            Reasoning <span className="optional">(optional)</span>
          </span>
          <div className="effort-row" role="group" aria-label="Reasoning effort">
            {EFFORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`effort-btn ${form.reasoningEffort === opt.value ? "active" : ""}`}
                aria-pressed={form.reasoningEffort === opt.value}
                onClick={() => patch({ reasoningEffort: opt.value, reasoningTokens: "" })}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span className="field-hint">Auto = model default. Off disables reasoning entirely.</span>
          <input
            type="number"
            className="field-input"
            placeholder="Token budget (e.g. 4000) — overrides effort"
            min={MIN_REASONING_TOKENS}
            aria-label="Reasoning token budget"
            value={form.reasoningTokens}
            onChange={(e) => patch({ reasoningTokens: e.target.value })}
          />
          <Toggle
            label="Collapse reasoning by default"
            checked={form.reasoningCollapsedByDefault}
            onChange={(v) => patch({ reasoningCollapsedByDefault: v })}
          />
          <span className="field-hint">Sets whether new replies' reasoning starts expanded.</span>
        </div>

        <hr className="divider" />

        <HiddenBlocksEditor rules={form.hiddenBlocks} onChange={(hiddenBlocks) => patch({ hiddenBlocks })} />

        <hr className="divider" />

        <button
          type="button"
          className="btn btn-ghost btn-full"
          disabled={!currentId}
          onClick={() => uiActions.openSummary("create")}
        >
          <IconSpark size={14} />
          Summarise conversation
        </button>
        <button type="button" className="btn btn-danger btn-full" disabled={!currentId} onClick={removeConvo}>
          Remove conversation
        </button>
      </div>
    </Modal>
  );
}

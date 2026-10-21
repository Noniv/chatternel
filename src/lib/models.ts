import { useEffect, useSyncExternalStore } from "react";

const MODELS_URL = "https://openrouter.ai/api/v1/models";

/** Model ID → whether it accepts image input, from OpenRouter's public model list. */
let catalog: Map<string, boolean> | null = null;
let loading: Promise<void> | null = null;
/** Models a request has shown to reject images, even if the catalog says otherwise (e.g. a pinned provider). */
const learnedNoVision = new Set<string>();
let version = 0;

const listeners = new Set<() => void>();

function emit(): void {
  version += 1;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

interface ModelEntry {
  id: string;
  canonical_slug?: string;
  architecture?: { input_modalities?: string[]; modality?: string };
}

function acceptsImages(model: ModelEntry): boolean {
  const inputs = model.architecture?.input_modalities;
  if (inputs) return inputs.includes("image");
  // Older shape: "text+image->text".
  return (model.architecture?.modality ?? "").split("->")[0].includes("image");
}

export function loadModelCatalog(): Promise<void> {
  if (!loading) {
    loading = (async () => {
      try {
        const res = await fetch(MODELS_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: { data?: ModelEntry[] } = await res.json();
        const map = new Map<string, boolean>();
        for (const model of data.data ?? []) {
          const vision = acceptsImages(model);
          map.set(model.id, vision);
          if (model.canonical_slug && !map.has(model.canonical_slug)) map.set(model.canonical_slug, vision);
        }
        catalog = map;
        emit();
      } catch {
        // Unknown capabilities just mean we send images and fall back if they're rejected.
        loading = null;
      }
    })();
  }
  return loading;
}

/**
 * Whether the model accepts images: true/false when known, null when it's not
 * in the catalog (or the catalog hasn't loaded) — callers treat null as "try".
 */
export function supportsImages(modelId: string): boolean | null {
  if (learnedNoVision.has(modelId)) return false;
  if (!catalog) return null;
  // Variants like ":free" or ":online" share the base model's capabilities.
  return catalog.get(modelId) ?? catalog.get(modelId.split(":")[0]) ?? null;
}

export function markNoVision(modelId: string): void {
  if (learnedNoVision.has(modelId)) return;
  learnedNoVision.add(modelId);
  emit();
}

export function useSupportsImages(modelId: string): boolean | null {
  useEffect(() => {
    void loadModelCatalog();
  }, []);
  useSyncExternalStore(subscribe, () => version);
  return supportsImages(modelId);
}

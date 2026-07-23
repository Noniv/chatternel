import type { HiddenBlockRule } from "../types";

export interface ExtractedSection {
  label: string;
  text: string;
}

export interface StripResult {
  /** The visible content, with every matched region removed. */
  content: string;
  /** Extracted regions, in the order they appeared, for expandable display. */
  sections: ExtractedSection[];
}

/**
 * Remove the regions described by `rules` from `raw` for display purposes,
 * returning the cleaned text plus the extracted regions so they can be shown in
 * collapsible blocks. Matching is literal (no regex) so any marker text is safe.
 *
 * When `streaming` is true, a rule whose `start` marker has appeared but whose
 * `end` marker hasn't arrived yet is treated as an in-progress block: the rest
 * of the buffer is hidden instead of flashing raw markers on screen.
 */
export function stripHiddenBlocks(
  raw: string,
  rules: HiddenBlockRule[],
  opts: { streaming?: boolean } = {},
): StripResult {
  const active = rules.filter((r) => r.enabled && r.start);
  if (active.length === 0) return { content: raw, sections: [] };

  const sections: ExtractedSection[] = [];
  let out = "";
  let i = 0;

  while (i < raw.length) {
    // Find the earliest starting marker at or after the cursor.
    let hit: { rule: HiddenBlockRule; at: number } | null = null;
    for (const rule of active) {
      const at = raw.indexOf(rule.start, i);
      if (at !== -1 && (hit === null || at < hit.at)) hit = { rule, at };
    }
    if (!hit) {
      out += raw.slice(i);
      break;
    }

    out += raw.slice(i, hit.at);
    const { rule, at } = hit;

    let end: number; // exclusive index just past the region to remove
    if (rule.end) {
      const found = raw.indexOf(rule.end, at + rule.start.length);
      if (found === -1) {
        if (opts.streaming) {
          // Block still being written — hide the tail, keep it as a section.
          sections.push({ label: rule.label, text: raw.slice(at) });
        } else {
          // Malformed (no closing marker) — leave it visible so it's noticed.
          out += raw.slice(at);
        }
        break;
      }
      end = found + rule.end.length;
    } else {
      const nl = raw.indexOf("\n", at);
      end = nl === -1 ? raw.length : nl;
    }

    sections.push({ label: rule.label, text: raw.slice(at, end) });
    i = end;
  }

  // Tidy up whitespace left where regions were removed.
  const content = out.replace(/[^\S\n]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return { content, sections };
}

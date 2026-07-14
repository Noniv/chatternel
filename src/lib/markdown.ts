export type Block =
  | { type: "code"; lang: string; code: string; closed: boolean }
  | { type: "text"; text: string };

export function parseBlocks(raw: string): Block[] {
  const blocks: Block[] = [];
  const lines = raw.split("\n");
  let text: string[] = [];
  let code: string[] | null = null;
  let lang = "";

  const flushText = () => {
    if (text.length) {
      const joined = text.join("\n");
      if (joined.trim()) blocks.push({ type: "text", text: joined });
      text = [];
    }
  };

  for (const line of lines) {
    if (code === null) {
      const fence = line.match(/^```(\w*)[ \t]*$/);
      if (fence) {
        flushText();
        lang = fence[1];
        code = [];
      } else {
        text.push(line);
      }
    } else if (/^```\s*$/.test(line)) {
      blocks.push({ type: "code", lang, code: code.join("\n").trimEnd(), closed: true });
      code = null;
    } else {
      code.push(line);
    }
  }

  if (code !== null) {
    blocks.push({ type: "code", lang, code: code.join("\n"), closed: false });
  } else {
    flushText();
  }
  return blocks;
}

export type Segment =
  | { kind: "p"; lines: string[] }
  | { kind: "heading"; level: number; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; start: number; items: string[] }
  | { kind: "quote"; lines: string[] };

export function parseSegments(text: string): Segment[] {
  return text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map(classifySegment);
}

function classifySegment(chunk: string): Segment {
  const lines = chunk.split("\n");

  const heading = lines.length === 1 && chunk.match(/^(#{1,4})\s+(.+)$/);
  if (heading) return { kind: "heading", level: heading[1].length, text: heading[2] };

  if (lines.every((l) => /^[-*]\s+/.test(l))) {
    return { kind: "ul", items: lines.map((l) => l.replace(/^[-*]\s+/, "")) };
  }

  const ordered = lines.every((l) => /^\d+[.)]\s+/.test(l));
  if (ordered) {
    const start = parseInt(lines[0], 10) || 1;
    return { kind: "ol", start, items: lines.map((l) => l.replace(/^\d+[.)]\s+/, "")) };
  }

  if (lines.every((l) => /^>\s?/.test(l))) {
    return { kind: "quote", lines: lines.map((l) => l.replace(/^>\s?/, "")) };
  }

  return { kind: "p", lines };
}

export type InlineToken =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "strong"; children: InlineToken[] }
  | { kind: "em"; children: InlineToken[] };

const INLINE_RE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|(_[^_\n]+_)/;

export function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let rest = text;
  while (rest) {
    const match = rest.match(INLINE_RE);
    if (!match || match.index === undefined) {
      tokens.push({ kind: "text", text: rest });
      break;
    }
    if (match.index > 0) tokens.push({ kind: "text", text: rest.slice(0, match.index) });
    const hit = match[0];
    if (hit.startsWith("`")) {
      tokens.push({ kind: "code", text: hit.slice(1, -1) });
    } else if (hit.startsWith("**")) {
      tokens.push({ kind: "strong", children: tokenizeInline(hit.slice(2, -2)) });
    } else {
      tokens.push({ kind: "em", children: tokenizeInline(hit.slice(1, -1)) });
    }
    rest = rest.slice(match.index + hit.length);
  }
  return tokens;
}

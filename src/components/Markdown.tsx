import hljs from "highlight.js/lib/common";
import { Fragment, memo, useMemo, type ReactNode } from "react";
import {
  parseBlocks,
  parseSegments,
  tokenizeInline,
  type InlineToken,
  type Segment,
} from "../lib/markdown";
import { CopyButton } from "./CopyButton";

function renderTokens(tokens: InlineToken[]): ReactNode {
  return tokens.map((token, i) => {
    switch (token.kind) {
      case "text":
        return <Fragment key={i}>{token.text}</Fragment>;
      case "code":
        return <code key={i}>{token.text}</code>;
      case "strong":
        return <strong key={i}>{renderTokens(token.children)}</strong>;
      case "em":
        return <em key={i}>{renderTokens(token.children)}</em>;
    }
  });
}

function Lines({ lines }: { lines: string[] }) {
  return lines.map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {renderTokens(tokenizeInline(line))}
    </Fragment>
  ));
}

function SegmentView({ seg }: { seg: Segment }) {
  switch (seg.kind) {
    case "heading": {
      const Tag = (["h3", "h4", "h5", "h6"] as const)[Math.min(seg.level - 1, 3)];
      return <Tag className={`md-h md-h${seg.level}`}>{renderTokens(tokenizeInline(seg.text))}</Tag>;
    }
    case "ul":
      return (
        <ul>
          {seg.items.map((item, i) => (
            <li key={i}>{renderTokens(tokenizeInline(item))}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol start={seg.start}>
          {seg.items.map((item, i) => (
            <li key={i}>{renderTokens(tokenizeInline(item))}</li>
          ))}
        </ol>
      );
    case "quote":
      return (
        <blockquote>
          <Lines lines={seg.lines} />
        </blockquote>
      );
    case "p":
      return (
        <p>
          <Lines lines={seg.lines} />
        </p>
      );
  }
}

const TextBlock = memo(function TextBlock({ text }: { text: string }) {
  const segments = useMemo(() => parseSegments(text), [text]);
  return segments.map((seg, i) => <SegmentView key={i} seg={seg} />);
});

const CodeBlock = memo(function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const highlighted = useMemo(() => {
    if (!lang || !hljs.getLanguage(lang)) return null;
    try {
      return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
    } catch {
      return null;
    }
  }, [lang, code]);

  return (
    <div className="code-block">
      <div className="code-head">
        <span className="code-lang">{lang || "text"}</span>
        <CopyButton className="code-copy" getText={() => code} label="Copy code" />
      </div>
      <pre>
        {highlighted !== null ? (
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        ) : (
          <code>{code}</code>
        )}
      </pre>
    </div>
  );
});

export const Markdown = memo(function Markdown({ text }: { text: string }) {
  const blocks = useMemo(() => parseBlocks(text), [text]);
  return (
    <>
      {blocks.map((block, i) =>
        block.type === "code" ? (
          <CodeBlock key={i} lang={block.lang} code={block.code} />
        ) : (
          <TextBlock key={i} text={block.text} />
        ),
      )}
    </>
  );
});

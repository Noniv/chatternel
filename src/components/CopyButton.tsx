import { useEffect, useRef, useState, type ReactNode } from "react";
import { copyText } from "../lib/clipboard";
import { toast } from "../state/toastStore";
import { IconCheck, IconCopy } from "./Icons";

export function CopyButton({
  getText,
  className,
  label = "Copy",
  children,
}: {
  getText: () => string;
  className?: string;
  label?: string;
  children?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onClick = async () => {
    const ok = await copyText(getText());
    if (!ok) {
      toast("Copy failed");
      return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button type="button" className={className} onClick={onClick} aria-label={label}>
      {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
      {children !== undefined ? children : <span>{copied ? "Copied" : "Copy"}</span>}
    </button>
  );
}

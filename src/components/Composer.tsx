import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { sendMessage, stopStream } from "../lib/engine";
import {
  IMAGE_ACCEPT,
  MAX_IMAGES_PER_MESSAGE,
  fileToAttachment,
  imageFilesFrom,
  type Attachment,
} from "../lib/images";
import { useStreamActive } from "../state/streamStore";
import { toast } from "../state/toastStore";
import { IconArrowUp, IconPlay, IconPlus, IconStop, IconX } from "./Icons";

const MAX_INPUT_HEIGHT = 160;

function hasFinePointer() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export function Composer({ convoId }: { convoId: string }) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<Attachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const active = useStreamActive();
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => ref.current?.focus(), 250);
    return () => window.clearTimeout(timer);
  }, [convoId]);

  useEffect(() => {
    setImages([]);
  }, [convoId]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, MAX_INPUT_HEIGHT) + "px";
  }, [text]);

  const addFiles = async (files: File[]) => {
    if (files.length === 0) return;
    const room = MAX_IMAGES_PER_MESSAGE - images.length;
    if (room <= 0) {
      toast(`Up to ${MAX_IMAGES_PER_MESSAGE} images per message.`);
      return;
    }
    if (files.length > room) toast(`Only the first ${room} image(s) were added.`);

    setLoadingImages(true);
    for (const file of files.slice(0, room)) {
      try {
        const attachment = await fileToAttachment(file);
        setImages((prev) => [...prev, attachment]);
      } catch (err) {
        toast((err as Error).message);
      }
    }
    setLoadingImages(false);
    ref.current?.focus();
  };

  const mode = active ? "stop" : text.trim() || images.length ? "send" : "continue";

  const submit = () => {
    if (active) {
      stopStream();
      return;
    }
    if (loadingImages) return;
    if (sendMessage(text, images.map((img) => img.url))) {
      setText("");
      setImages([]);
    }
  };

  return (
    <div className="composer">
      <div
        className={`composer-card${dragging ? " dropping" : ""}`}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragging(false);
        }}
        onDrop={(e) => {
          const files = imageFilesFrom(e.dataTransfer);
          if (e.dataTransfer.types.includes("Files")) e.preventDefault();
          setDragging(false);
          void addFiles(files);
        }}
      >
        {images.length > 0 && (
          <ul className="attachments" aria-label="Attached images">
            {images.map((img) => (
              <li key={img.id} className="attachment">
                <img src={img.url} alt={img.name} />
                <button
                  type="button"
                  className="attachment-remove"
                  aria-label={`Remove ${img.name}`}
                  onClick={() => setImages((prev) => prev.filter((a) => a.id !== img.id))}
                >
                  <IconX size={12} />
                </button>
                <span className="attachment-name" title={img.name}>
                  {img.name}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="composer-row">
          <textarea
            ref={ref}
            className="composer-input"
            placeholder="Message…"
            rows={1}
            value={text}
            autoComplete="off"
            autoCorrect="on"
            autoCapitalize="sentences"
            spellCheck
            aria-label="Message"
            onChange={(e) => setText(e.target.value)}
            onPaste={(e) => {
              const files = imageFilesFrom(e.clipboardData);
              if (files.length === 0) return;
              e.preventDefault();
              void addFiles(files);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                submit();
                return;
              }
              if (!e.shiftKey && !e.altKey && hasFinePointer()) {
                e.preventDefault();
                if (mode === "send") submit();
              }
            }}
          />

          <input
            ref={fileRef}
            type="file"
            accept={IMAGE_ACCEPT}
            multiple
            hidden
            onChange={(e) => {
              void addFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="attach-btn"
            onClick={() => fileRef.current?.click()}
            disabled={active || loadingImages}
            aria-label="Attach images"
            title="Attach images"
          >
            <IconPlus size={20} />
          </button>

          <button
            type="button"
            className={`send-btn ${mode}`}
            onClick={submit}
            disabled={loadingImages && !active}
            aria-label={mode === "stop" ? "Stop generating" : mode === "continue" ? "Continue reply" : "Send"}
          >
            {mode === "stop" ? <IconStop /> : mode === "continue" ? <IconPlay size={16} /> : <IconArrowUp />}
          </button>
        </div>
      </div>
      <p className="composer-hint" aria-hidden="true">
        Enter to send · Shift+Enter for a new line · + or paste to attach an image
        {mode === "continue" ? " · empty message asks the model to continue" : ""}
      </p>
    </div>
  );
}

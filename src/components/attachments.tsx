import { useCallback, useRef, useState } from "react";
import {
  IMAGE_ACCEPT,
  MAX_IMAGES_PER_MESSAGE,
  fileToAttachment,
  type Attachment,
} from "../lib/images";
import { toast } from "../state/toastStore";
import { IconX } from "./Icons";

/** Turns stored data URLs from a sent message back into editable attachments. */
export function toAttachments(urls: string[] | undefined): Attachment[] {
  return (urls ?? []).map((url, i) => ({ id: `saved-${i}-${url.length}`, name: "", url }));
}

/**
 * Shared image-picking state for the composer and the message editor: the list
 * of pending images, a hidden file input, and the add/remove helpers.
 */
export function useAttachments(initial: Attachment[] = []) {
  const [images, setImages] = useState<Attachment[]>(initial);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Stable identities so callers can use these in effect dependency lists.
  const clear = useCallback(() => setImages([]), []);
  const remove = useCallback((id: string) => setImages((prev) => prev.filter((a) => a.id !== id)), []);

  const addFiles = async (files: File[]) => {
    if (files.length === 0) return;
    let room = MAX_IMAGES_PER_MESSAGE - images.length;
    if (room <= 0) {
      toast(`Up to ${MAX_IMAGES_PER_MESSAGE} images per message.`);
      return;
    }
    if (files.length > room) toast(`Only the first ${room} image(s) were added.`);

    setLoading(true);
    for (const file of files.slice(0, room)) {
      try {
        const attachment = await fileToAttachment(file);
        setImages((prev) => (prev.length >= MAX_IMAGES_PER_MESSAGE ? prev : [...prev, attachment]));
        room -= 1;
      } catch (err) {
        toast((err as Error).message);
      }
    }
    setLoading(false);
  };

  return {
    images,
    loading,
    urls: () => images.map((img) => img.url),
    clear,
    remove,
    addFiles,
    openPicker: () => inputRef.current?.click(),
    picker: (
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          void addFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    ),
  };
}

export function AttachmentStrip({
  images,
  onRemove,
}: {
  images: Attachment[];
  onRemove: (id: string) => void;
}) {
  if (images.length === 0) return null;
  return (
    <ul className="attachments" aria-label="Attached images">
      {images.map((img, i) => (
        <li key={img.id} className="attachment">
          <img src={img.url} alt={img.name || `Image ${i + 1}`} />
          <button
            type="button"
            className="attachment-remove"
            aria-label={`Remove ${img.name || `image ${i + 1}`}`}
            onClick={() => onRemove(img.id)}
          >
            <IconX size={12} />
          </button>
          {img.name && (
            <span className="attachment-name" title={img.name}>
              {img.name}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

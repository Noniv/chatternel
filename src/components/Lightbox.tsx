import { useEffect, useRef } from "react";
import { uiActions, useUi } from "../state/uiStore";
import { IconChevronLeft, IconX } from "./Icons";

/**
 * Full-size viewer for an image in a message.
 *
 * Browsers block navigating a tab to a `data:` URL, so a plain link to the
 * image would only ever open a blank page — the picture is shown here instead.
 */
export function Lightbox() {
  const { lightbox } = useUi();
  const panelRef = useRef<HTMLDivElement>(null);
  const open = lightbox !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") uiActions.closeLightbox();
      if (e.key === "ArrowLeft") uiActions.stepLightbox(-1);
      if (e.key === "ArrowRight") uiActions.stepLightbox(1);
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus({ preventScroll: true });
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!lightbox) return null;
  const { images, index } = lightbox;
  const many = images.length > 1;

  return (
    <div
      ref={panelRef}
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Image ${index + 1} of ${images.length}`}
      tabIndex={-1}
      onClick={uiActions.closeLightbox}
    >
      <button type="button" className="lightbox-close icon-btn" aria-label="Close image">
        <IconX size={20} />
      </button>

      {many && (
        <button
          type="button"
          className="lightbox-step prev"
          aria-label="Previous image"
          disabled={index === 0}
          onClick={(e) => {
            e.stopPropagation();
            uiActions.stepLightbox(-1);
          }}
        >
          <IconChevronLeft size={22} />
        </button>
      )}

      <img
        className="lightbox-img"
        src={images[index]}
        alt={`Attached image ${index + 1}`}
        onClick={(e) => e.stopPropagation()}
      />

      {many && (
        <button
          type="button"
          className="lightbox-step next"
          aria-label="Next image"
          disabled={index === images.length - 1}
          onClick={(e) => {
            e.stopPropagation();
            uiActions.stepLightbox(1);
          }}
        >
          <IconChevronLeft size={22} />
        </button>
      )}

      {many && (
        <span className="lightbox-count" aria-hidden="true">
          {index + 1} / {images.length}
        </span>
      )}
    </div>
  );
}

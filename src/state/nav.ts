import { useEffect, useRef, useState } from "react";
import type { Conversation } from "../types";
import { useAppState } from "./appStore";

/** Length of the mobile pane slide. Passed to CSS as --pane-slide. */
export const PANE_SLIDE_MS = 320;

export interface NavView {
  chatOpen: boolean;
  /** Conversation the chat pane renders; lingers while the pane slides out. */
  paneConvo: Conversation | null;
  /** Conversations the sidebar renders; frozen while the pane slides in. */
  listConvos: Conversation[];
  listActiveId: string | null;
}

/** The panes only slide on mobile, and not when the user asked for less motion. */
function slides(): boolean {
  return (
    window.matchMedia("(max-width: 899.98px)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Keeps the sidebar and the chat pane showing the pre-navigation state until the
 * slide between them is over, so a store change never repaints a pane the user is
 * still looking at: a new conversation is inserted into the list only once the chat
 * pane covers it, and the conversation being left stays on screen all the way out.
 */
export function useNav(): NavView {
  const { conversations, currentId } = useAppState();
  const convo = conversations.find((c) => c.id === currentId) ?? null;

  const [lingering, setLingering] = useState<Conversation | null>(null);
  const [frozen, setFrozen] = useState<{ convos: Conversation[]; activeId: string | null } | null>(
    null,
  );
  const [prevId, setPrevId] = useState(currentId);
  const painted = useRef({ convo, conversations });

  if (currentId !== prevId) {
    // A navigation landed in this render. Hold whatever was last painted in place
    // for the length of the slide; the store's new state lands off-screen.
    if (slides()) {
      const opening = currentId !== null;
      setLingering(opening ? null : painted.current.convo);
      setFrozen(opening ? { convos: painted.current.conversations, activeId: prevId } : null);
    }
    setPrevId(currentId);
  }

  useEffect(() => {
    painted.current = { convo, conversations };
  });

  useEffect(() => {
    if (!lingering) return;
    const timer = window.setTimeout(() => setLingering(null), PANE_SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [lingering]);

  useEffect(() => {
    if (!frozen) return;
    const timer = window.setTimeout(() => setFrozen(null), PANE_SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [frozen]);

  return {
    chatOpen: convo !== null,
    paneConvo: convo ?? lingering,
    listConvos: frozen ? frozen.convos : conversations,
    listActiveId: frozen ? frozen.activeId : currentId,
  };
}

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { stopStream } from "../lib/engine";
import { appActions } from "../state/appStore";
import { useStream } from "../state/streamStore";
import { uiActions } from "../state/uiStore";
import type { Conversation } from "../types";
import { Composer } from "./Composer";
import { IconArrowDown, IconChevronLeft, IconGear, IconSpark } from "./Icons";
import { MessageItem } from "./MessageItem";

function ChatHeader({ convo }: { convo: Conversation }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const commit = () => {
    appActions.setTitle(convo.id, draft);
    setEditing(false);
  };

  return (
    <header className="chat-head">
      <div className="chat-head-inner">
        <button
          type="button"
          className="icon-btn back-btn"
          aria-label="Back to conversations"
          onClick={() => {
            stopStream();
            appActions.goHome();
          }}
        >
          <IconChevronLeft size={20} />
        </button>
        {editing ? (
          <input
            className="chat-title-input"
            value={draft}
            autoFocus
            aria-label="Conversation title"
            onFocus={(e) => e.target.select()}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              } else if (e.key === "Escape") {
                setDraft(convo.title);
                setEditing(false);
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="chat-title"
            title="Rename conversation"
            onClick={() => {
              setDraft(convo.title);
              setEditing(true);
            }}
          >
            {convo.title}
          </button>
        )}
        <div className="chat-head-chips">
          {convo.summary && (
            <button
              type="button"
              className="chip chip-accent"
              onClick={() => uiActions.openSummary("view")}
            >
              <IconSpark size={11} />
              Summary
            </button>
          )}
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label="Settings"
          onClick={uiActions.openSettings}
        >
          <IconGear size={19} />
        </button>
      </div>
    </header>
  );
}

export function ChatView({ convo }: { convo: Conversation }) {
  const stream = useStream();
  const scrollRef = useRef<HTMLDivElement>(null);
  const reservedRef = useRef<HTMLElement | null>(null);
  const prevActive = useRef(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const touchStart = useRef({ x: 0, y: 0 });

  const liveHere = stream.active && stream.convoId === convo.id;

  const updateScrollBtn = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(dist > 120);
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    updateScrollBtn();
  }, [convo.id, updateScrollBtn]);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    if (liveHere && !prevActive.current) {
      const target = container.querySelector<HTMLElement>(`[data-idx="${stream.index}"]`);
      const body = target?.querySelector<HTMLElement>(".msg-content");
      const anchor =
        container.querySelector<HTMLElement>(`[data-idx="${stream.index - 1}"]`) ?? target;
      if (body && anchor) {
        const offset = 12;
        const delta =
          anchor.getBoundingClientRect().top - container.getBoundingClientRect().top - offset;
        if (delta > 24) {
          const inner = container.querySelector<HTMLElement>(".msgs-inner");
          const padBottom = inner ? parseFloat(getComputedStyle(inner).paddingBottom) || 0 : 0;
          const gap = body.getBoundingClientRect().top - anchor.getBoundingClientRect().top;
          const reserve = Math.max(0, container.clientHeight - offset - gap - padBottom);
          if (reserve > 40) {
            body.style.minHeight = `${reserve}px`;
            reservedRef.current = body;
          }
          container.scrollTo({ top: container.scrollTop + delta, behavior: "smooth" });
        }
      }
    }

    if (!liveHere && prevActive.current) {
      const body = reservedRef.current;
      reservedRef.current = null;
      const wasNear =
        container.scrollHeight - container.scrollTop - container.clientHeight < 80;
      const finish = () => {
        if (wasNear) container.scrollTo({ top: container.scrollHeight });
        updateScrollBtn();
      };
      if (body?.isConnected) {
        body.style.minHeight = "0px";
        window.setTimeout(() => {
          if (body.isConnected) body.style.minHeight = "";
          finish();
        }, 470);
      } else {
        finish();
      }
    }

    prevActive.current = liveHere;
  }, [liveHere, stream.index, updateScrollBtn]);

  useEffect(() => {
    if (liveHere) updateScrollBtn();
  }, [liveHere, stream.content, stream.reasoning, updateScrollBtn]);

  const onTouchStart = (e: ReactTouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: ReactTouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStart.current.y);
    if (deltaX > 70 && deltaY < 60 && touchStart.current.x < 40) {
      stopStream();
      appActions.goHome();
    }
  };

  return (
    <div className="chat" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <ChatHeader convo={convo} />
      <div className="msgs" ref={scrollRef} onScroll={updateScrollBtn}>
        <div className="msgs-inner">
          {convo.messages.map((msg, i) => (
            <MessageItem
              key={i}
              msg={msg}
              index={i}
              convoId={convo.id}
              live={liveHere && stream.index === i ? stream : null}
            />
          ))}
        </div>
      </div>
      <div className="chat-foot">
        <button
          type="button"
          className={`scroll-btn ${showScrollBtn ? "visible" : ""}`}
          aria-label="Scroll to latest message"
          aria-hidden={!showScrollBtn}
          tabIndex={showScrollBtn ? 0 : -1}
          onClick={() => {
            scrollRef.current?.scrollTo({
              top: scrollRef.current.scrollHeight,
              behavior: "smooth",
            });
          }}
        >
          <IconArrowDown size={17} />
        </button>
        <Composer convoId={convo.id} />
      </div>
    </div>
  );
}

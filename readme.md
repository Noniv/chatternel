# Chatternel 🖤

**A private, mobile-first chat client for [OpenRouter](https://openrouter.ai). Bring your own API key, talk to any model, keep every word on your own device.**

**[Try it → chatternel.vercel.app](https://chatternel.vercel.app)** — no signup, no install, no waiting.

---

Chatternel is a single-page web app that talks straight to OpenRouter's API from your browser. There is no backend, no account system, and no sync server — nothing between you and the model that could log, moderate, or lose your conversations. Your API key and chat history live in your browser's `localStorage` and leave your device only if you export them yourself.

Add it to your phone's home screen and it behaves like a native app. Open it on a desktop and it grows into a full two-pane chat client.

## Why Chatternel?

Most ways to use OpenRouter come with a catch:

- **OpenRouter's own chat** is heavy, slows down with long conversations, and layers extra moderation on top of the model.
- **Self-hosted frontends** give you control, but you have to actually host them — and most are rough on mobile.
- **Third-party clients** are convenient… and store your conversations on *their* servers.

Chatternel is the middle path: zero install, zero backend, genuinely good on a phone, and private by architecture rather than by promise.

## Features

### 🎛️ Total model control
- **Any model, by ID** — type any OpenRouter model ID directly; you're never limited to a curated dropdown.
- **Provider pinning** — route requests to a specific provider (DeepInfra, Together, Fireworks…), with your choice of strict failure or automatic fallback.
- **Sampling control** — temperature and top-p sliders, sent only when you've actually changed them.

### 🧠 Built for reasoning models
- Set reasoning **effort** (auto / off / minimal → max) or an **exact token budget**.
- Reasoning traces stream in above the reply, collapsible with one tap — including `<think>`-style traces from models that inline them.

### 🖼️ Show it, don't describe it
Tap the **+** next to the send button to attach a picture — a screenshot, a photo, a diagram, a page of handwriting — and ask about it in the same message.

- **Attach however you like** — pick files with **+**, paste straight from your clipboard, or drag them onto the composer.
- **Several at once** — send up to 8 images per message; they show as thumbnails you can remove before sending, and stay with the message afterwards.
- **Kept light** — big pictures are resized in your browser before they're sent, so requests stay quick and your saved chats stay small.
- PNG, JPEG, WebP and GIF, sent to OpenRouter exactly the way its API expects. Just make sure the model you've picked can actually see — a text-only model will simply reject the request.

### 🫥 Hidden blocks
Elaborate system prompts often make the model emit bookkeeping you don't want to *read* but do want the model to *keep* — status headers, tracking notes, scratch metadata, and the like. Define your own marker pairs in **Settings**, and any matched region folds away into a collapsible block, just like reasoning. It's display-only: the text stays in the message and is still sent to the model on the next turn — only your on-screen view is tidied.

### ⚡ Streaming that doesn't flinch
Replies render live, but finished paragraphs and code blocks never re-flow or flicker mid-stream — even in very long conversations. Your question pins to the top of the view while the answer fills in below.

### ✏️ Every message is editable
- Edit any of **your** messages and regenerate the conversation from that point.
- Edit the **model's** replies too — the conversation history is yours to shape.
- **Redo** a reply and flip between alternative versions (‹ 2/3 ›).
- **Continue** a reply that got cut off with one tap on an empty input.
- Copy any message, or any code block, in one tap.

### ✨ Summarize instead of forgetting
Long conversation eating your context window? Generate an AI summary of it, **review and edit it yourself**, choose how many recent messages to keep, and carry on. The summary rides along invisibly as context in future turns — and feeds into the *next* summary when you compress again.

### 📝 Proper rendering
Markdown, headings, lists, quotes — and fenced code blocks with **syntax highlighting** in ~35 languages, each with a copy button.

### 🔒 Private by architecture
- Everything stored in `localStorage`, on your device, full stop.
- One-tap **JSON export/import** for backups or moving between devices.
- No telemetry, no analytics, no cookies, no external requests — even the fonts are bundled.
- No moderation or rewriting layer: what the model says is what you see.

### 📱 Mobile-first, desktop-ready
- Slide-over chat panel, swipe-back gesture, safe-area aware, installable as a PWA.
- On desktop: persistent sidebar, hover states, `Enter` to send / `Shift+Enter` for a new line.
- Focus rings, keyboard navigation, and reduced-motion support included.

## Getting started

1. Grab an API key at [openrouter.ai](https://openrouter.ai)
2. Open [chatternel.vercel.app](https://chatternel.vercel.app)
3. Paste the key in **Settings**, pick a model, start chatting

That's it. Your key is stored locally and sent only to OpenRouter, with every request visible in your browser's network tab.

## Development

React 19 + TypeScript + Vite. Fully client-side — deploy the `dist/` folder to any static host.

```sh
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
npm run preview  # serve the production build
```

## License & disclaimer

Chatternel is an independent project, not affiliated with OpenRouter. You bring your own API key and pay OpenRouter directly for what you use.

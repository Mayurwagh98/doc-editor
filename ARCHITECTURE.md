# Architecture Note

## Overview

DocSpace is a lightweight collaborative document editor. I targeted the core loop — create, edit, save, share — and built it deeply rather than covering every Google Docs feature shallowly.

---

## Key Decisions

### 1. TipTap as the Rich Text Editor

TipTap (built on ProseMirror) was the right call over contenteditable DIYs or Draft.js. It has a clean React hook API (`useEditor`), great TypeScript types, and StarterKit bundles all the formatting primitives I needed (bold, italic, headings, lists). Adding Underline was a one-line import. Content is stored as HTML strings in MongoDB — simple, portable, and renders identically on re-load.

**Trade-off:** TipTap's collaborative extension (Yjs) would enable real-time sync, but that was out of scope. The autosave-on-blur model is a well-understood substitute for single-user editing.

### 2. JWT Authentication (stateless)

I used short-lived JWTs (7-day) stored in `localStorage`. For a production system I'd use httpOnly cookies with refresh token rotation. For this scope, localStorage JWT keeps the client simple and avoids CORS/cookie complexity in a local dev setup.

### 3. MongoDB Document Model

The `Document` schema embeds `sharedWith` as a sub-array of `{ user, permission }` entries rather than a separate `Permissions` collection. This keeps reads fast (single query for a document + its ACL), and for a product at this scale the document count per user will be low enough that array scanning is fine. At scale, a separate permissions table with indexed lookups would be the correct move.

### 4. File Upload Strategy

Files are accepted via Multer, processed in memory (mammoth for .docx, manual for .txt/.md), and immediately deleted from disk. The processed HTML is stored as a new Document. This avoids blob storage complexity while still supporting the core use case of "import a file, edit it."

**Supported formats:** `.txt`, `.md`, `.docx`. PDF was excluded because reliable PDF-to-rich-text conversion requires heavier dependencies (pdf-parse or a headless browser) that would bloat setup time.

### 5. Autosave

The editor debounces saves 1.5 seconds after the last keystroke. This mirrors the Google Docs model. A "saving..." / "saved" indicator provides clear feedback. I track `lastSavedContent` and `lastSavedTitle` refs to avoid no-op API calls when nothing changed.

---

## Intentional Scope Cuts

| Feature | Why cut |
|---------|---------|
| Real-time collaboration | Would need Socket.io + Yjs CRDT. Significant complexity, separate concern from core edit loop. |
| Document version history | Time constraint. Schema is ready (add a `versions` array); just needs API + UI. |
| Email notifications | Requires SMTP/SendGrid setup — poor DX for a local reviewer. |
| PDF export | Headless browser or heavy library. Not worth the setup cost. |
| Full-text search | MongoDB `$text` index on content. Fast to add but low priority for this scope. |

---

## Data Flow

```
Browser → React (TipTap) → axios → Express API → Mongoose → MongoDB
                ↑                        ↓
        AuthContext (JWT)    JWT middleware (protect)
```

### Document Lifecycle

1. User creates doc → `POST /api/documents` → returns doc with `_id`
2. Navigate to editor → `GET /api/documents/:id` → hydrate TipTap
3. User types → debounced `PUT /api/documents/:id` → saved in Mongo
4. User shares → `POST /api/documents/:id/share` → adds to `sharedWith` array
5. Shared user logs in → `GET /api/documents` returns owned + shared → filtered by `$or` query

---

## Security Notes

- Passwords hashed with bcrypt (10 rounds)
- JWT verified on every protected request via middleware
- Document access checked server-side on every read/write (owner or in `sharedWith`)
- File uploads validated by extension + MIME and size-capped at 5 MB
- Multer temp files deleted immediately after processing

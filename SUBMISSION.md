# Submission Checklist

## Candidate
**Name:** Mayur Wagh
**Email:** mswagh98@gmail.com
**Assignment:** Ajaia LLC — AI-Native Full Stack Developer

---

## What Is Included

| Item | Status | Notes |
|------|--------|-------|
| Source code (backend) | ✅ | `backend/` — Node.js, Express, MongoDB |
| Source code (frontend) | ✅ | `frontend/` — React, Vite, Tailwind, TipTap |
| README.md | ✅ | Local setup, test accounts, project structure |
| ARCHITECTURE.md | ✅ | Design decisions and trade-offs |
| AI_WORKFLOW.md | ✅ | AI tools used, what was changed/rejected, verification |
| Automated tests | ✅ | `backend/tests/` — Jest + Supertest (auth + documents) |
| Seed script | ✅ | `backend/seed.js` — 3 users + 3 sample documents |

---

## Live Deployment

> Deploy to Railway, Render, or Vercel+MongoDB Atlas using instructions in README.
> Live URL: [add after deployment]

---

## Test Credentials (post-seed)

```
mswagh98@gmail.com  /  password123
alice@example.com   /  password123
bob@example.com     /  password123
```

---

## What Is Working

- User registration and login with JWT auth
- Create, rename, delete documents
- Rich text editing: Bold, Italic, Underline, Strikethrough, H1/H2/H3, bullet and ordered lists
- Autosave (1.5s debounce) + manual save with status indicator
- File import: .txt, .md, .docx (drag-and-drop + browse, max 5MB)
- Document sharing: share by email, set Editor or Viewer permission, revoke access
- Dashboard: owned vs. shared distinction, document preview cards, search, filter tabs
- View-only mode enforced for Viewer-permission shared documents
- 10 automated API tests covering auth and document CRUD

## What Is Incomplete

- Real-time collaboration (no Socket.io/Yjs)
- Document version history
- Export to PDF or Markdown
- Email notifications on share
- Full-text search across content body

## What I'd Build Next (with 2–4 more hours)

1. **Real-time collaboration** — Add Socket.io + Yjs CRDT. TipTap's `@tiptap/extension-collaboration` plugs in cleanly. Would add cursor presence indicators.
2. **Version history** — Store content snapshots in a `versions` sub-array on save. Diff viewer UI.
3. **Export** — `html-to-docx` or `puppeteer` for PDF export from the editor.
4. **Full-text search** — MongoDB `$text` index on `content` field with a search bar on the dashboard.

---

## Walkthrough Video

[Add Loom/YouTube link here]

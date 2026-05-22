# AI Workflow Note

## Tools Used

- **Claude (Anthropic)** — primary AI assistant for architecture planning, code generation, and review
- **GitHub Copilot** — inline completions in VS Code for boilerplate and repetitive patterns

---

## Where AI Materially Sped Up Work

**Schema and model design.** I described the data model requirements and AI suggested the embedded `sharedWith` array approach vs. a separate permissions table. We weighed trade-offs together; I chose embedded for simplicity at this scope.

**TipTap integration.** The TipTap API requires non-obvious setup (correct extension order, `editable` toggling after async load, autosave debounce with refs). AI generated a working scaffold that I then refined for the autosave + view-only mode logic.

**Multer + Mammoth pipeline.** AI produced the file type filtering, disk storage config, and mammoth call in one pass. I modified the error handling and added the "delete temp file after processing" step.

**Tailwind component styling.** AI drafted the structural HTML/Tailwind for the ShareModal and Dashboard card grid. I iteratively adjusted spacing, colors, and responsive breakpoints by hand.

**Test scaffolding.** AI generated the Jest + Supertest test structure with the `beforeAll`/`afterEach` MongoDB lifecycle. I added the sharing permission test cases myself because those were the product-critical paths I wanted to verify.

---

## What I Changed or Rejected

**Rejected: in-memory `lowdb` for storage.** AI initially suggested a file-based store to simplify setup. I rejected this because MongoDB is production-appropriate and the assignment explicitly specifies it, and reviewers deserve to see real persistence.

**Changed: auth token storage.** AI's first pass used `sessionStorage`. I switched to `localStorage` so the session persists across tab closes and page refreshes — more appropriate for a document editor workflow.

**Changed: autosave timing.** AI used a 3-second debounce. I reduced it to 1.5 seconds after testing — 3 seconds felt sluggish and left the "unsaved" indicator on screen too long during normal typing.

**Changed: file processing cleanup.** The initial AI draft kept uploaded files on disk. I added `fs.unlink` after processing because storing raw uploads indefinitely is unnecessary (we convert to HTML immediately) and wastes disk.

**Rejected: Yjs real-time collaboration.** AI offered to scaffold this as a stretch feature. I deliberately skipped it to protect the core editing experience — rushing in Socket.io + CRDT under time pressure would have introduced instability without meaningful UX gain for a solo reviewer.

---

## How I Verified Correctness

**Backend:** Ran the Jest + Supertest suite against a live local MongoDB instance. All auth and document routes tested including edge cases (duplicate email, wrong password, non-owner access, share permission enforcement).

**Frontend:** Manual end-to-end testing through the full user journey: register → create doc → edit with rich text → rename → upload file → share with another test account → log in as that account → verify view-only mode → log back → revoke access.

**TipTap content persistence:** Created a document, added H1/H2 headings, bold, italic, underline, and bullet lists, closed the tab, reopened — verified HTML round-trips correctly.

**File upload:** Tested .txt (with special characters), .md (with headers and bold), and .docx (a real Word file) — all converted and rendered cleanly.

---

## Reflection

AI was genuinely useful for the boilerplate-heavy parts — Multer config, Mongoose schema setup, Tailwind layout patterns. The parts that required product judgment (what to cut, how autosave should feel, when to use embedded vs. relational data) required my own decisions. AI accelerated implementation velocity without substituting for architectural thinking.

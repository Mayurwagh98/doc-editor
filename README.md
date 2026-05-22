# DocSpace — Collaborative Document Editor

A lightweight collaborative document editor built with React, Node.js, Express, and MongoDB.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, TipTap (rich text) |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose ODM) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| File Upload | Multer, Mammoth (docx parsing) |

---

## Prerequisites

- Node.js ≥ 18
- MongoDB running locally on `mongodb://localhost:27017` (or set `MONGODB_URI` in `.env`)
- npm or yarn

---

## Local Setup

### 1. Clone / unzip the project

```bash
cd docs-app
```

### 2. Backend setup

```bash
cd backend
cp .env.example .env        # Edit if needed (MongoDB URI, JWT secret)
npm install
npm run seed                # Creates 3 test users + sample documents
npm run dev                 # Starts on http://localhost:5000
```

### 3. Frontend setup

```bash
cd ../frontend
npm install
npm run dev                 # Starts on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## Test Accounts

After running `npm run seed`:

| Name | Email | Password |
|------|-------|----------|
| Mayur Wagh | mswagh98@gmail.com | password123 |
| Alice Johnson | alice@example.com | password123 |
| Bob Smith | bob@example.com | password123 |

**To test sharing:** Log in as Mayur → open "Design Spec v1" → it's a document owned by Alice, shared with Mayur as viewer.

---

## Features

### Document Management
- Create, rename, and delete documents
- Rich text editing with Bold, Italic, Underline, Strikethrough, Headings (H1–H3), Bullet lists, Numbered lists
- Autosave every 1.5 seconds after typing stops
- Manual save button

### File Import
- Upload `.txt`, `.md`, or `.docx` files
- Converts to a new editable document
- Max file size: 5 MB
- Drag-and-drop supported

### Sharing
- Share documents with any registered user by email
- Set permission: **Editor** (can edit) or **Viewer** (read-only)
- Owner can update or revoke permissions at any time
- Dashboard shows owned vs. shared documents with distinct badges

### Persistence
- All documents and user data stored in MongoDB
- Content preserved as HTML (TipTap format)
- Survives browser refresh and server restart

---

## Running Tests

```bash
cd backend
npm test
```

Tests use a separate `docsapp_test` database. Requires MongoDB running locally.

Test coverage includes:
- Auth: register, login, JWT validation, duplicates
- Documents: CRUD, access control, sharing, permission enforcement

---

## Project Structure

```
docs-app/
├── backend/
│   ├── config/db.js          # MongoDB connection
│   ├── middleware/auth.js     # JWT middleware
│   ├── models/
│   │   ├── User.js
│   │   └── Document.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── documents.js
│   ├── tests/
│   │   ├── auth.test.js
│   │   └── documents.test.js
│   ├── server.js
│   └── seed.js
├── frontend/
│   ├── src/
│   │   ├── api/index.js       # Axios + interceptors
│   │   ├── contexts/AuthContext.jsx
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── ShareModal.jsx
│   │   │   └── FileUploadModal.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── Editor.jsx
│   │   └── App.jsx
│   └── ...
├── ARCHITECTURE.md
├── AI_WORKFLOW.md
└── SUBMISSION.md
```

---

## Environment Variables

### Backend (`backend/.env`)

```env
MONGODB_URI=mongodb://localhost:27017/docsapp
JWT_SECRET=your_super_secret_jwt_key_change_in_production
PORT=5000
CLIENT_URL=http://localhost:5173
```

---

## What's Working

- Full auth flow (register, login, JWT, protected routes)
- Document CRUD with ownership model
- TipTap rich text editor (bold, italic, underline, headings, lists)
- Autosave + manual save
- Document sharing with viewer/editor permissions
- File upload (.txt, .md, .docx) with content conversion
- Dashboard with owned/shared distinction and document previews
- Responsive UI

## What's Incomplete / Would Build Next

With another 2-4 hours:
- Real-time collaboration (Socket.io + Yjs CRDT)
- Document version history
- Export to PDF / Markdown
- Full-text search across document content
- Email notifications on share
- Role-based permission beyond owner/editor/viewer

Live frontend URL: https://doc-editor-ruby.vercel.app/login

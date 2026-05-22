const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const Document = require('../models/Document');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// ── Multer setup ──────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.txt', '.md', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only .txt, .md, and .docx files are supported'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const escapeHtml = (str) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const textToHtml = (text) => {
  const lines = text.split('\n');
  return lines
    .map((line) => {
      if (line.trim() === '') return '<p><br></p>';
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join('');
};

const mdToBasicHtml = (md) => {
  let html = escapeHtml(md);
  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  // Bold & italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Lists
  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>(\n|$))+/g, (match) => `<ul>${match}</ul>`);
  // Paragraphs
  html = html.replace(/\n{2,}/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  return `<p>${html}</p>`;
};

// ── GET /api/documents ────────────────────────────────────────────────────────
// Returns all documents the user owns OR is shared on
router.get('/', protect, async (req, res) => {
  try {
    const docs = await Document.find({
      $or: [{ owner: req.user._id }, { 'sharedWith.user': req.user._id }],
    })
      .populate('owner', 'name email')
      .populate('sharedWith.user', 'name email')
      .sort({ updatedAt: -1 });

    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

// ── POST /api/documents ───────────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Document title is required' });
    }

    const doc = await Document.create({
      title: title.trim(),
      content: content || '',
      owner: req.user._id,
      lastEditedBy: req.user._id,
    });

    const populated = await doc.populate('owner', 'name email');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create document' });
  }
});

// ── GET /api/documents/:id ────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('sharedWith.user', 'name email')
      .populate('lastEditedBy', 'name email');

    if (!doc) return res.status(404).json({ message: 'Document not found' });

    if (!doc.hasAccess(req.user._id)) {
      return res.status(403).json({ message: 'You do not have access to this document' });
    }

    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch document' });
  }
});

// ── PUT /api/documents/:id ────────────────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    if (!doc.canEdit(req.user._id)) {
      return res.status(403).json({ message: 'You do not have edit permission for this document' });
    }

    const { title, content } = req.body;

    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ message: 'Title cannot be empty' });
      doc.title = title.trim();
    }
    if (content !== undefined) doc.content = content;
    doc.lastEditedBy = req.user._id;

    await doc.save();

    const populated = await doc.populate([
      { path: 'owner', select: 'name email' },
      { path: 'sharedWith.user', select: 'name email' },
      { path: 'lastEditedBy', select: 'name email' },
    ]);

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update document' });
  }
});

// ── DELETE /api/documents/:id ─────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    if (doc.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the document owner can delete it' });
    }

    await doc.deleteOne();
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete document' });
  }
});

// ── POST /api/documents/:id/share ─────────────────────────────────────────────
router.post('/:id/share', protect, async (req, res) => {
  try {
    const { email, permission = 'editor' } = req.body;

    if (!email) return res.status(400).json({ message: 'Email is required' });
    if (!['viewer', 'editor'].includes(permission)) {
      return res.status(400).json({ message: 'Permission must be viewer or editor' });
    }

    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    if (doc.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can share this document' });
    }

    const targetUser = await User.findOne({ email: email.toLowerCase() });
    if (!targetUser) {
      return res.status(404).json({ message: `No user found with email ${email}` });
    }

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot share a document with yourself' });
    }

    // Update or add share entry
    const existingIdx = doc.sharedWith.findIndex(
      (s) => s.user.toString() === targetUser._id.toString()
    );

    if (existingIdx >= 0) {
      doc.sharedWith[existingIdx].permission = permission;
    } else {
      doc.sharedWith.push({ user: targetUser._id, permission });
    }

    await doc.save();

    const populated = await doc.populate([
      { path: 'owner', select: 'name email' },
      { path: 'sharedWith.user', select: 'name email' },
    ]);

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to share document' });
  }
});

// ── DELETE /api/documents/:id/share/:userId ────────────────────────────────────
router.delete('/:id/share/:userId', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    if (doc.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can remove shares' });
    }

    doc.sharedWith = doc.sharedWith.filter(
      (s) => s.user.toString() !== req.params.userId
    );

    await doc.save();

    const populated = await doc.populate([
      { path: 'owner', select: 'name email' },
      { path: 'sharedWith.user', select: 'name email' },
    ]);

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove share' });
  }
});

// ── POST /api/documents/upload ────────────────────────────────────────────────
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const titleBase = path.basename(req.file.originalname, ext);
    let htmlContent = '';

    if (ext === '.docx') {
      const result = await mammoth.convertToHtml({ path: req.file.path });
      htmlContent = result.value;
    } else {
      const raw = fs.readFileSync(req.file.path, 'utf8');
      htmlContent = ext === '.md' ? mdToBasicHtml(raw) : textToHtml(raw);
    }

    // Clean up uploaded file after processing
    fs.unlink(req.file.path, () => {});

    const doc = await Document.create({
      title: titleBase || 'Imported Document',
      content: htmlContent,
      owner: req.user._id,
      lastEditedBy: req.user._id,
    });

    const populated = await doc.populate('owner', 'name email');
    res.status(201).json(populated);
  } catch (error) {
    // Clean up file on error
    if (req.file) fs.unlink(req.file.path, () => {});

    if (error.message && error.message.includes('Only .txt')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to process uploaded file' });
  }
});

module.exports = router;

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { documentsAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';
import ShareModal from '../components/ShareModal';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Bold,
  Italic,
  UnderlineIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Share2,
  Save,
  CheckCircle2,
  Loader2,
  Strikethrough,
  Undo,
  Redo,
  Eye,
} from 'lucide-react';

const AUTOSAVE_DELAY = 1500; // ms

const ToolbarButton = ({ onClick, active, disabled, title, children }) => (
  <button
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    disabled={disabled}
    title={title}
    className={`
      p-1.5 rounded-md transition-colors text-sm
      ${active
        ? 'bg-blue-100 text-blue-700'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }
      ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
    `}
  >
    {children}
  </button>
);

const Divider = () => <div className="w-px h-5 bg-gray-200 mx-1" />;

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [document, setDocument] = useState(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState('saved'); // 'saved' | 'saving' | 'unsaved'
  const [showShare, setShowShare] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const titleRef = useRef();
  const saveTimer = useRef(null);
  const lastSavedContent = useRef('');
  const lastSavedTitle = useRef('');

  const canEdit = document
    ? document.owner._id === user?._id ||
      document.owner === user?._id ||
      document.sharedWith?.some(
        (s) =>
          (s.user._id === user?._id || s.user === user?._id) &&
          s.permission === 'editor'
      )
    : false;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
    ],
    content: '',
    editable: false, // set after load
    onUpdate: ({ editor }) => {
      if (!canEdit) return;
      setSaveState('unsaved');
      scheduleAutosave(title, editor.getHTML());
    },
  });

  // Load document
  useEffect(() => {
    const load = async () => {
      try {
        const res = await documentsAPI.get(id);
        const doc = res.data;
        setDocument(doc);
        setTitle(doc.title);
        lastSavedTitle.current = doc.title;
        lastSavedContent.current = doc.content;
        if (editor) {
          editor.commands.setContent(doc.content || '');
          editor.setEditable(
            doc.owner._id === user?._id ||
            doc.sharedWith?.some(
              (s) => (s.user._id === user?._id) && s.permission === 'editor'
            )
          );
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load document');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    if (editor) load();
  }, [id, editor]);

  // Update editable when canEdit changes
  useEffect(() => {
    if (editor && document) {
      editor.setEditable(canEdit);
    }
  }, [canEdit, editor, document]);

  const save = useCallback(
    async (newTitle, newContent) => {
      if (!document) return;
      const t = newTitle ?? title;
      const c = newContent ?? editor?.getHTML() ?? '';

      // Skip if nothing changed
      if (t === lastSavedTitle.current && c === lastSavedContent.current) {
        setSaveState('saved');
        return;
      }

      setSaveState('saving');
      try {
        const res = await documentsAPI.update(document._id, { title: t, content: c });
        lastSavedTitle.current = t;
        lastSavedContent.current = c;
        setDocument(res.data);
        setSaveState('saved');
      } catch {
        setSaveState('unsaved');
        toast.error('Auto-save failed');
      }
    },
    [document, title, editor]
  );

  const scheduleAutosave = useCallback(
    (t, c) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => save(t, c), AUTOSAVE_DELAY);
    },
    [save]
  );

  // Cleanup timer on unmount — flush save
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setSaveState('unsaved');
    scheduleAutosave(newTitle, editor?.getHTML());
  };

  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (!title.trim()) {
      setTitle(lastSavedTitle.current || 'Untitled Document');
      return;
    }
    save(title, editor?.getHTML());
  };

  const handleManualSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    save(title, editor?.getHTML());
  };

  const handleShareUpdate = (updatedDoc) => {
    setDocument(updatedDoc);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading document…</p>
        </div>
      </div>
    );
  }

  const isOwner = document?.owner._id === user?._id;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 sm:px-6 h-14 flex items-center gap-3">
        {/* Back */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm transition mr-1"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Docs</span>
        </button>

        {/* Title */}
        <div className="flex-1 min-w-0">
          {editingTitle && canEdit ? (
            <input
              ref={titleRef}
              value={title}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') titleRef.current?.blur();
                if (e.key === 'Escape') {
                  setTitle(lastSavedTitle.current);
                  setEditingTitle(false);
                }
              }}
              className="w-full max-w-lg text-base font-semibold text-gray-900 bg-transparent border-b-2 border-blue-500 outline-none px-0"
              autoFocus
            />
          ) : (
            <h1
              onClick={() => canEdit && setEditingTitle(true)}
              className={`text-base font-semibold text-gray-900 truncate max-w-lg ${canEdit ? 'cursor-text hover:text-blue-700 transition-colors' : ''}`}
              title={canEdit ? 'Click to rename' : ''}
            >
              {title || 'Untitled Document'}
            </h1>
          )}
        </div>

        {/* Save status + actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Save state indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            {saveState === 'saving' && (
              <span className="flex items-center gap-1 text-gray-400">
                <Loader2 size={12} className="animate-spin" />
                Saving…
              </span>
            )}
            {saveState === 'saved' && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 size={12} />
                Saved
              </span>
            )}
            {saveState === 'unsaved' && canEdit && (
              <span className="text-amber-500">Unsaved changes</span>
            )}
          </div>

          {!canEdit && document && (
            <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
              <Eye size={11} />
              View only
            </span>
          )}

          {canEdit && (
            <button
              onClick={handleManualSave}
              disabled={saveState === 'saving' || saveState === 'saved'}
              className="flex items-center gap-1.5 border border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 text-sm font-medium px-3 py-1.5 rounded-lg transition"
            >
              <Save size={13} />
              Save
            </button>
          )}

          {/* Share button — visible to everyone with access */}
          {document && (
            <button
              onClick={() => setShowShare(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition"
            >
              <Share2 size={13} />
              Share
            </button>
          )}
        </div>
      </header>

      {/* Formatting toolbar */}
      {editor && (
        <div className="sticky top-14 z-10 bg-white border-b border-gray-100 px-4 sm:px-6 py-1.5 flex items-center flex-wrap gap-0.5 overflow-x-auto">
          {/* Undo / Redo */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo (Ctrl+Z)"
          >
            <Undo size={15} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo (Ctrl+Y)"
          >
            <Redo size={15} />
          </ToolbarButton>

          <Divider />

          {/* Headings */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 size={15} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 size={15} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <Heading3 size={15} />
          </ToolbarButton>

          <Divider />

          {/* Text formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <Bold size={15} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
          >
            <Italic size={15} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon size={15} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough size={15} />
          </ToolbarButton>

          <Divider />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet list"
          >
            <List size={15} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Numbered list"
          >
            <ListOrdered size={15} />
          </ToolbarButton>

          {/* Keyboard shortcut hints */}
          {!canEdit && (
            <span className="ml-auto text-xs text-gray-400 italic">View-only mode</span>
          )}
        </div>
      )}

      {/* Editor content area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full">
          <EditorContent editor={editor} />
          {!loading && !canEdit && document && (
            <div className="fixed bottom-4 right-4 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-lg">
              <Eye size={12} />
              View-only — you can read but not edit
            </div>
          )}
        </div>
      </main>

      {/* Share modal */}
      {showShare && document && (
        <ShareModal
          document={document}
          onClose={() => setShowShare(false)}
          onUpdate={handleShareUpdate}
        />
      )}
    </div>
  );
}

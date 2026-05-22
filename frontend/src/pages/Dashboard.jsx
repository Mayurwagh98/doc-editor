import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import FileUploadModal from '../components/FileUploadModal';
import { documentsAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Plus,
  Upload,
  FileText,
  Trash2,
  Users,
  Clock,
  Crown,
  Search,
  Share2,
} from 'lucide-react';

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'mine' | 'shared'
  const [showUpload, setShowUpload] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await documentsAPI.list();
      setDocuments(res.data);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await documentsAPI.create({ title: 'Untitled Document', content: '' });
      toast.success('Document created');
      navigate(`/documents/${res.data._id}`);
    } catch {
      toast.error('Failed to create document');
      setCreating(false);
    }
  };

  const handleDelete = async (e, docId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    setDeletingId(docId);
    try {
      await documentsAPI.delete(docId);
      setDocuments((d) => d.filter((doc) => doc._id !== docId));
      toast.success('Document deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  const isOwner = (doc) =>
    doc.owner._id === user?._id || doc.owner === user?._id;

  const filtered = documents.filter((doc) => {
    const matchSearch = doc.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ||
      (filter === 'mine' && isOwner(doc)) ||
      (filter === 'shared' && !isOwner(doc));
    return matchSearch && matchFilter;
  });

  const myDocs = documents.filter(isOwner);
  const sharedDocs = documents.filter((d) => !isOwner(d));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {documents.length} document{documents.length !== 1 ? 's' : ''} total
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-2.5 rounded-xl text-sm transition"
            >
              <Upload size={15} />
              Import
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition"
            >
              {creating ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              New document
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'All', count: documents.length, icon: FileText, filter: 'all', color: 'blue' },
            { label: 'Mine', count: myDocs.length, icon: Crown, filter: 'mine', color: 'amber' },
            { label: 'Shared with me', count: sharedDocs.length, icon: Users, filter: 'shared', color: 'green' },
          ].map(({ label, count, icon: Icon, filter: f, color }) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                flex items-center gap-3 p-4 rounded-xl border-2 transition text-left
                ${filter === f
                  ? `border-${color}-500 bg-${color}-50`
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
            >
              <div className={`p-2 rounded-lg ${filter === f ? `bg-${color}-100` : 'bg-gray-100'}`}>
                <Icon size={16} className={filter === f ? `text-${color}-600` : 'text-gray-500'} />
              </div>
              <div>
                <p className={`text-xl font-bold ${filter === f ? `text-${color}-700` : 'text-gray-900'}`}>{count}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        {/* Document grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 h-44 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-gray-100 p-5 rounded-2xl mb-4">
              <FileText size={32} className="text-gray-400" />
            </div>
            <h3 className="text-gray-700 font-semibold text-lg mb-1">
              {search ? 'No results found' : 'No documents yet'}
            </h3>
            <p className="text-gray-400 text-sm mb-6 max-w-xs">
              {search
                ? `No documents match "${search}"`
                : 'Create your first document or import a file to get started.'}
            </p>
            {!search && (
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-blue-700 transition"
              >
                <Plus size={15} />
                Create document
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((doc) => {
              const owned = isOwner(doc);
              const sharedCount = doc.sharedWith?.length || 0;
              return (
                <div
                  key={doc._id}
                  onClick={() => navigate(`/documents/${doc._id}`)}
                  className="bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition cursor-pointer group overflow-hidden"
                >
                  {/* Document preview area */}
                  <div className="h-28 bg-gradient-to-br from-gray-50 to-gray-100 border-b border-gray-100 p-4 overflow-hidden">
                    <div className="text-xs text-gray-400 leading-relaxed line-clamp-4 select-none">
                      {doc.content
                        ? doc.content.replace(/<[^>]+>/g, ' ').trim().slice(0, 120) || 'Empty document'
                        : 'Empty document'}
                    </div>
                  </div>

                  <div className="p-3.5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                        {doc.title}
                      </h3>
                      {/* Ownership badge */}
                      {owned ? (
                        <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium">
                          <Crown size={10} />
                          Mine
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium">
                          <Share2 size={10} />
                          Shared
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={11} />
                        {formatDate(doc.updatedAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        {sharedCount > 0 && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Users size={11} />
                            {sharedCount}
                          </span>
                        )}
                        {owned && (
                          <button
                            onClick={(e) => handleDelete(e, doc._id)}
                            disabled={deletingId === doc._id}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                            title="Delete"
                          >
                            {deletingId === doc._id ? (
                              <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showUpload && (
        <FileUploadModal
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}

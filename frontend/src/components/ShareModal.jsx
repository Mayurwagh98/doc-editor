import { useState } from 'react';
import { documentsAPI, authAPI } from '../api';
import toast from 'react-hot-toast';
import { X, UserPlus, Trash2, Crown, Eye, Edit3, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function ShareModal({ document, onClose, onUpdate }) {
  const { user: currentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('editor');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sharing, setSharing] = useState(false);

  const isOwner = document.owner._id === currentUser._id || document.owner === currentUser._id;

  const handleSearch = async (value) => {
    setEmail(value);
    if (value.length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await authAPI.searchUsers(value);
      setSearchResults(res.data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleShare = async (targetEmail) => {
    const shareEmail = targetEmail || email;
    if (!shareEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    setSharing(true);
    try {
      const res = await documentsAPI.share(document._id, {
        email: shareEmail.trim(),
        permission,
      });
      toast.success('Document shared!');
      setEmail('');
      setSearchResults([]);
      onUpdate(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to share document');
    } finally {
      setSharing(false);
    }
  };

  const handleRemove = async (userId) => {
    try {
      const res = await documentsAPI.removeShare(document._id, userId);
      toast.success('Access removed');
      onUpdate(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove access');
    }
  };

  const handlePermissionChange = async (userId, newPermission) => {
    try {
      const targetUser = document.sharedWith.find((s) => s.user._id === userId);
      if (!targetUser) return;
      const res = await documentsAPI.share(document._id, {
        email: targetUser.user.email,
        permission: newPermission,
      });
      onUpdate(res.data);
    } catch (err) {
      toast.error('Failed to update permission');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Share document</h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{document.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Add people */}
          {isOwner && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Add people</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Enter email address…"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                  {/* Search results dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                      {searchResults.map((u) => (
                        <button
                          key={u._id}
                          onClick={() => {
                            setEmail(u.email);
                            setSearchResults([]);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition"
                        >
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                            {u.name[0].toUpperCase()}
                          </div>
                          <div className="text-left min-w-0">
                            <p className="font-medium text-gray-900 truncate">{u.name}</p>
                            <p className="text-gray-400 text-xs truncate">{u.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <select
                  value={permission}
                  onChange={(e) => setPermission(e.target.value)}
                  className="border border-gray-300 rounded-lg text-sm px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  onClick={() => handleShare()}
                  disabled={sharing || !email.trim()}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-3 py-2 rounded-lg transition"
                >
                  {sharing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <UserPlus size={14} />
                  )}
                  Share
                </button>
              </div>
            </div>
          )}

          {/* People with access */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">People with access</h3>
            <div className="space-y-2">
              {/* Owner */}
              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-semibold flex items-center justify-center flex-shrink-0">
                    {document.owner.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{document.owner.name}</p>
                    <p className="text-xs text-gray-500 truncate">{document.owner.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-amber-600 font-medium flex-shrink-0 bg-amber-50 px-2 py-1 rounded-full">
                  <Crown size={11} />
                  Owner
                </div>
              </div>

              {/* Shared users */}
              {document.sharedWith.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No one else has access yet</p>
              )}
              {document.sharedWith.map((share) => (
                <div
                  key={share.user._id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 text-sm font-semibold flex items-center justify-center flex-shrink-0">
                      {share.user.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{share.user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{share.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isOwner ? (
                      <>
                        <select
                          value={share.permission}
                          onChange={(e) => handlePermissionChange(share.user._id, e.target.value)}
                          className="border border-gray-200 rounded text-xs px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        >
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button
                          onClick={() => handleRemove(share.user._id)}
                          className="text-gray-400 hover:text-red-500 p-1 rounded transition"
                          title="Remove access"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        {share.permission === 'editor' ? <Edit3 size={11} /> : <Eye size={11} />}
                        {share.permission}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium py-2.5 rounded-xl text-sm transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

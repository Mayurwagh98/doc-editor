import { useState, useRef } from 'react';
import { documentsAPI } from '../api';
import toast from 'react-hot-toast';
import { X, Upload, FileText, File } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ALLOWED_TYPES = ['.txt', '.md', '.docx'];
const ALLOWED_MIME = [
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export default function FileUploadModal({ onClose }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const navigate = useNavigate();

  const validateFile = (f) => {
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!ALLOWED_TYPES.includes(ext)) {
      toast.error(`Unsupported file type. Please upload .txt, .md, or .docx`);
      return false;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5 MB');
      return false;
    }
    return true;
  };

  const handleFile = (f) => {
    if (f && validateFile(f)) setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await documentsAPI.upload(formData);
      toast.success('File imported as new document!');
      onClose();
      navigate(`/documents/${res.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = () => {
    if (!file) return <Upload size={32} className="text-gray-400" />;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'docx') return <FileText size={32} className="text-blue-500" />;
    return <File size={32} className="text-green-500" />;
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Import document</h2>
            <p className="text-xs text-gray-500 mt-0.5">Supported: .txt, .md, .docx (max 5 MB)</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
              ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
            `}
          >
            <div className="flex flex-col items-center gap-3">
              {getFileIcon()}
              {file ? (
                <div>
                  <p className="text-sm font-semibold text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Drop file here or <span className="text-blue-600">browse</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">.txt, .md, .docx up to 5 MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.docx"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </div>

          {/* Info */}
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
            <p className="font-medium mb-1">How it works</p>
            <p className="text-blue-600 leading-relaxed">
              Your file will be converted into a new editable document. The original file is not stored — only the imported content is saved to your workspace.
            </p>
          </div>
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium py-2.5 rounded-xl text-sm transition"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-xl text-sm transition"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Importing…
              </>
            ) : (
              <>
                <Upload size={14} />
                Import file
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

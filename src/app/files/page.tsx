"use client";

import { Suspense, useEffect, useState, useMemo, useCallback, memo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "../toast";
import { Folder, File as FileIcon, ChevronLeft, Download, Pencil, Trash2, X, Eye } from "lucide-react";

type Entry = {
  name: string;
  isDir: boolean;
  size: number;
  mtime: number;
};

// Helper function to check if file is binary/non-editable
const isNonEditableFile = (filename: string) => {
  const lower = filename.toLowerCase();
  return lower.endsWith('.jar') || lower.endsWith('.zip') || lower.endsWith('.rar') || lower.endsWith('.log.gz');
};

// Memoized folder row component
const FolderRow = memo(({ 
  name, 
  onOpen, 
  onDelete, 
  serverBusy 
}: { 
  name: string; 
  onOpen: () => void; 
  onDelete: () => void; 
  serverBusy: boolean;
}) => (
  <div className="w-full hover:bg-neutral-900/60">
    <div className="p-2 text-white break-all flex items-center justify-between gap-3">
      <button
        onClick={onOpen}
        className="inline-flex items-center gap-2 hover:text-neutral-200"
        title="Open folder"
      >
        <Folder className="h-4 w-4" />
        {name}
      </button>
      <button
        title={serverBusy ? "Delete disabled while server is running" : "Delete folder"}
        disabled={serverBusy}
        onClick={onDelete}
        className={serverBusy ? "text-neutral-600 cursor-not-allowed" : "hover:text-white"}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  </div>
));
FolderRow.displayName = 'FolderRow';

// Memoized file row component
const FileRow = memo(({ 
  name, 
  fullPath,
  onView, 
  onEdit, 
  onDelete, 
  onDownload,
  serverBusy 
}: { 
  name: string;
  fullPath: string;
  onView: () => void; 
  onEdit: () => void; 
  onDelete: () => void; 
  onDownload: () => void;
  serverBusy: boolean;
}) => {
  const isNonEditable = useMemo(() => isNonEditableFile(fullPath), [fullPath]);

  return (
    <div className="w-full hover:bg-neutral-900/60">
      <div className="p-2 text-white break-all flex items-center justify-between gap-3">
        {isNonEditable ? (
          <span className="inline-flex items-center gap-2 text-neutral-200">
            <FileIcon className="h-4 w-4" />
            {name}
          </span>
        ) : (
          <button
            onClick={onView}
            className="inline-flex items-center gap-2 hover:text-neutral-200"
            title="View"
          >
            <FileIcon className="h-4 w-4" />
            {name}
          </button>
        )}
        <span className="inline-flex items-center gap-2 text-neutral-300">
          {!isNonEditable && (
            <button title="View" onClick={onView} className="hover:text-white">
              <Eye className="h-4 w-4" />
            </button>
          )}
          <button title="Download" onClick={onDownload} className="hover:text-white">
            <Download className="h-4 w-4" />
          </button>
          {!isNonEditable && (
            <button
              title={serverBusy ? "Edit disabled while server is running" : "Edit"}
              disabled={serverBusy}
              onClick={onEdit}
              className={serverBusy ? "text-neutral-600 cursor-not-allowed" : "hover:text-white"}
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <button
            title={serverBusy ? "Delete disabled while server is running" : "Delete"}
            disabled={serverBusy}
            onClick={onDelete}
            className={serverBusy ? "text-neutral-600 cursor-not-allowed" : "hover:text-white"}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </span>
      </div>
    </div>
  );
});
FileRow.displayName = 'FileRow';

function FilesClient() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverBusy, setServerBusy] = useState(false);
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [viewingPath, setViewingPath] = useState<string | null>(null);
  const [viewingContent, setViewingContent] = useState<string>("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const rel = searchParams.get("path") || "";

  // Memoize sorted entries
  const { folders, files } = useMemo(() => {
    if (!entries) return { folders: [], files: [] };
    return {
      folders: entries.filter(e => e.isDir),
      files: entries.filter(e => !e.isDir)
    };
  }, [entries]);

  // Load files
  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = rel ? `?path=${encodeURIComponent(rel)}` : "";
      const res = await fetch(`/api/list-mc${qs}`);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [rel]);

  // Initial load
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Use SSE for server status
  useEffect(() => {
    const eventSource = new EventSource('/api/server-status-stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const busy = data?.status === 'online' || data?.status === 'starting' || data?.status === 'stopping';
        setServerBusy(!!busy);
      } catch (e) {
        console.error('[SSE] Failed to parse status:', e);
      }
    };

    eventSource.onerror = () => {
      // EventSource will automatically reconnect
    };

    return () => eventSource.close();
  }, []);

  // Handlers
  const handleFolderOpen = useCallback((name: string) => {
    const next = rel ? `${rel}/${name}` : name;
    router.push(`/files?path=${encodeURIComponent(next)}`);
  }, [rel, router]);

  const handleFolderDelete = useCallback((name: string) => {
    if (serverBusy) {
      showToast('Delete is disabled while server is running', 'info');
      return;
    }
    const folderRel = rel ? `${rel}/${name}` : name;
    setDeletingPath(folderRel);
  }, [rel, serverBusy, showToast]);

  const handleFileView = useCallback(async (name: string) => {
    try {
      const fileRel = rel ? `${rel}/${name}` : name;
      const res = await fetch(`/api/mc-file?path=${encodeURIComponent(fileRel)}`);
      if (!res.ok) throw new Error('Failed to load file');
      const data = await res.json();
      setViewingPath(fileRel);
      setViewingContent(data.content ?? "");
    } catch (err) {
      console.error(err);
      showToast('✗ Failed to load file', 'error');
    }
  }, [rel, showToast]);

  const handleFileEdit = useCallback(async (name: string) => {
    if (serverBusy) {
      showToast('Edit is disabled while server is running', 'info');
      return;
    }
    try {
      const fileRel = rel ? `${rel}/${name}` : name;
      const res = await fetch(`/api/mc-file?path=${encodeURIComponent(fileRel)}`);
      if (!res.ok) throw new Error('Failed to load file');
      const data = await res.json();
      setEditingPath(fileRel);
      setEditingContent(data.content ?? "");
    } catch (err) {
      console.error(err);
      showToast('✗ Failed to load file', 'error');
    }
  }, [rel, serverBusy, showToast]);

  const handleFileDelete = useCallback((name: string) => {
    if (serverBusy) {
      showToast('Delete is disabled while server is running', 'info');
      return;
    }
    const fileRel = rel ? `${rel}/${name}` : name;
    setDeletingPath(fileRel);
  }, [rel, serverBusy, showToast]);

  const handleFileDownload = useCallback(async (name: string) => {
    try {
      const fileRel = rel ? `${rel}/${name}` : name;
      showToast(`⬇ Downloading ${name}...`, 'info', 2000);
      const url = `/api/mc-file?path=${encodeURIComponent(fileRel)}&download=1`;
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => {
        showToast(`✓ ${name} downloaded`, 'success');
      }, 500);
    } catch (err) {
      console.error(err);
      showToast('✗ Download failed', 'error');
    }
  }, [rel, showToast]);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (serverBusy) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const form = new FormData();
    Array.from(files).forEach(f => form.append('files', f));
    const qs = rel ? `?path=${encodeURIComponent(rel)}` : '';
    const res = await fetch(`/api/upload-mc${qs}`, { method: 'POST', body: form });
    if (!res.ok) {
      showToast('✗ Upload failed', 'error');
      return;
    }
    showToast('✓ Files uploaded successfully', 'success');
    await loadFiles();
    e.currentTarget.value = '';
  }, [serverBusy, rel, showToast, loadFiles]);

  const handleSave = useCallback(async () => {
    try {
      const res = await fetch('/api/mc-file', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: editingPath, content: editingContent })
      });
      if (!res.ok) throw new Error('Save failed');
      setEditingPath(null);
      showToast('✓ File saved successfully', 'success');
    } catch (err) {
      console.error(err);
      showToast('✗ Failed to save file', 'error');
    }
  }, [editingPath, editingContent, showToast]);

  const handleDelete = useCallback(async () => {
    try {
      showToast('Deleting...', 'info', 1500);
      const res = await fetch(`/api/mc-file?path=${encodeURIComponent(deletingPath!)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setDeletingPath(null);
      showToast('✓ File deleted successfully', 'success');
      await loadFiles();
    } catch (err) {
      console.error(err);
      showToast('✗ Failed to delete file', 'error');
    }
  }, [deletingPath, showToast, loadFiles]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-10 h-full">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {rel && (
              <button
                onClick={() => {
                  const parts = rel.split("/").filter(Boolean);
                  parts.pop();
                  const parent = parts.join("/");
                  router.push(parent ? `/files?path=${encodeURIComponent(parent)}` : "/files");
                }}
                className="inline-flex items-center gap-1 text-neutral-300 hover:text-white text-sm"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            )}
            <h1 className="text-xl font-bold text-white">Files{rel ? ` / ${rel}` : ""}</h1>
          </div>
          <div>
            <label 
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm cursor-pointer ${serverBusy ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed' : 'bg-white text-black hover:opacity-90'}`}
              onClick={(e) => {
                if (serverBusy) {
                  e.preventDefault();
                  showToast('Uploads are disabled while server is running or busy', 'info');
                }
              }}
            >
              <input
                type="file"
                multiple
                className="hidden"
                disabled={serverBusy}
                onChange={handleUpload}
              />
              Upload
            </label>
          </div>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-neutral-300 text-sm">
            <span
              aria-hidden
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-neutral-600 border-t-white"
            />
            Loading files...
          </div>
        )}
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
        {!loading && !error && (
          <div className="divide-y divide-neutral-800 rounded-lg border border-neutral-800 overflow-hidden">
            <div className="grid grid-cols-1 bg-neutral-900 text-neutral-400 text-xs uppercase tracking-wide">
              <div className="p-2">Name</div>
            </div>
            {folders.map((e, i) => (
              <FolderRow
                key={`d-${e.name}-${i}`}
                name={e.name}
                onOpen={() => handleFolderOpen(e.name)}
                onDelete={() => handleFolderDelete(e.name)}
                serverBusy={serverBusy}
              />
            ))}
            {files.map((e, i) => (
              <FileRow
                key={`f-${e.name}-${i}`}
                name={e.name}
                fullPath={rel ? `${rel}/${e.name}` : e.name}
                onView={() => handleFileView(e.name)}
                onEdit={() => handleFileEdit(e.name)}
                onDelete={() => handleFileDelete(e.name)}
                onDownload={() => handleFileDownload(e.name)}
                serverBusy={serverBusy}
              />
            ))}

            {/* Editor modal */}
            {editingPath && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="w-[min(90vw,900px)] h-[70vh] bg-neutral-950 border border-neutral-800 rounded-lg shadow-xl overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800">
                    <div className="text-sm text-neutral-300 break-all">Editing: {editingPath}</div>
                    <button onClick={() => setEditingPath(null)} className="text-neutral-400 hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <textarea
                    className="flex-1 p-3 bg-neutral-950 text-neutral-100 outline-none resize-none font-mono text-sm"
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                  />
                  <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-neutral-800">
                    <button
                      onClick={() => setEditingPath(null)}
                      className="px-3 py-1.5 text-sm rounded bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-3 py-1.5 text-sm rounded bg-white text-black hover:opacity-90"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Viewer modal */}
            {viewingPath && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="w-[min(90vw,900px)] h-[70vh] bg-neutral-950 border border-neutral-800 rounded-lg shadow-xl overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800">
                    <div className="text-sm text-neutral-300 break-all">Viewing: {viewingPath}</div>
                    <button onClick={() => setViewingPath(null)} className="text-neutral-400 hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <pre className="flex-1 p-3 bg-neutral-950 text-neutral-100 overflow-auto whitespace-pre-wrap break-words font-mono text-sm">{viewingContent}</pre>
                  <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-neutral-800">
                    <button
                      onClick={() => setViewingPath(null)}
                      className="px-3 py-1.5 text-sm rounded bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete confirm */}
            {deletingPath && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="w-[min(90vw,500px)] bg-neutral-950 border border-neutral-800 rounded-lg shadow-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-neutral-800 text-white">Delete</div>
                  <div className="px-4 py-3 text-neutral-300 break-all">Are you sure you want to delete "{deletingPath}"?</div>
                  <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-neutral-800">
                    <button onClick={() => setDeletingPath(null)} className="px-3 py-1.5 text-sm rounded bg-neutral-800 text-neutral-200 hover:bg-neutral-700">Cancel</button>
                    <button
                      onClick={handleDelete}
                      className="px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FilesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 md:p-10 h-full flex items-center gap-3 text-neutral-300">
          <span
            aria-hidden
            className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-neutral-600 border-t-white"
          />
          Loading files...
        </div>
      }
    >
      <FilesClient />
    </Suspense>
  );
}

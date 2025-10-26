"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "../toast";
import { Folder, File as FileIcon, ChevronLeft, Download, Pencil, Trash2, X, Eye } from "lucide-react";

type Entry = {
  name: string;
  isDir: boolean;
  size: number;
  mtime: number;
};

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

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        // Update server busy status
        try {
          const sres = await fetch('/api/check-server');
          const sdata = await sres.json();
          const busy = sdata?.status === 'online' || sdata?.status === 'starting' || sdata?.status === 'stopping';
          setServerBusy(!!busy);
        } catch {}
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
    };
    run();
    const id = setInterval(async () => {
      try {
        const sres = await fetch('/api/check-server');
        const sdata = await sres.json();
        const busy = sdata?.status === 'online' || sdata?.status === 'starting' || sdata?.status === 'stopping';
        setServerBusy(!!busy);
      } catch {}
    }, 5000);
    return () => clearInterval(id);
  }, [rel]);

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
            <label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm cursor-pointer ${serverBusy ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed' : 'bg-white text-black hover:opacity-90'}`}
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
                onChange={async (e) => {
                  if (serverBusy) return;
                  const files = e.target.files;
                  if (!files || files.length === 0) return;
                  const form = new FormData();
                  Array.from(files).forEach(f => form.append('files', f));
                  const qs = rel ? `?path=${encodeURIComponent(rel)}` : '';
                  const res = await fetch(`/api/upload-mc${qs}`, { method: 'POST', body: form });
                  if (!res.ok) {
                    alert('Upload failed');
                    return;
                  }
                  showToast('Upload successful', 'success');
                  // refresh listing
                  const listQs = rel ? `?path=${encodeURIComponent(rel)}` : '';
                  const res2 = await fetch(`/api/list-mc${listQs}`);
                  const data2 = await res2.json();
                  setEntries(data2.entries || []);
                  // reset input
                  e.currentTarget.value = '';
                }}
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
            {/* Folders first */}
            {entries?.filter(e => e.isDir).map((e, i) => (
              <div key={`d-${i}`} className="w-full hover:bg-neutral-900/60">
                <div className="p-2 text-white break-all flex items-center justify-between gap-3">
                  <button
                    onClick={() => {
                      const next = rel ? `${rel}/${e.name}` : e.name;
                      router.push(`/files?path=${encodeURIComponent(next)}`);
                    }}
                    className="inline-flex items-center gap-2 hover:text-neutral-200"
                    title="Open folder"
                  >
                    <Folder className="h-4 w-4" />
                    {e.name}
                  </button>
                  <span className="inline-flex items-center gap-2 text-neutral-300">
                    <button
                      title={serverBusy ? "Delete disabled while server is running" : "Delete folder"}
                      disabled={serverBusy}
                      onClick={() => {
                        if (serverBusy) {
                          showToast('Delete is disabled while server is running', 'info');
                          return;
                        }
                        const folderRel = rel ? `${rel}/${e.name}` : e.name;
                        setDeletingPath(folderRel);
                      }}
                      className={serverBusy ? "text-neutral-600 cursor-not-allowed" : "hover:text-white"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                </div>
              </div>
            ))}
            {/* Files */}
            {entries?.filter(e => !e.isDir).map((e, i) => (
              <div key={`f-${i}`} className="w-full hover:bg-neutral-900/60">
                <div className="p-2 text-white break-all flex items-center justify-between gap-3">
                  {(((rel ? `${rel}/${e.name}` : e.name).toLowerCase().endsWith('.jar') || (rel ? `${rel}/${e.name}` : e.name).toLowerCase().endsWith('.zip') || (rel ? `${rel}/${e.name}` : e.name).toLowerCase().endsWith('.rar') || (rel ? `${rel}/${e.name}` : e.name).toLowerCase().endsWith('.log.gz')) ? (                    <span className="inline-flex items-center gap-2 text-neutral-200">
                      <FileIcon className="h-4 w-4" />
                      {e.name}
                    </span>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          const fileRel = rel ? `${rel}/${e.name}` : e.name;
                          const res = await fetch(`/api/mc-file?path=${encodeURIComponent(fileRel)}`);
                          if (!res.ok) throw new Error('Failed to load file');
                          const data = await res.json();
                          setViewingPath(fileRel);
                          setViewingContent(data.content ?? "");
                        } catch (err) {
                          console.error(err);
                          alert('Failed to load file');
                        }
                      }}
                      className="inline-flex items-center gap-2 hover:text-neutral-200"
                      title="View"
                    >
                      <FileIcon className="h-4 w-4" />
                      {e.name}
                    </button>
                  ))}
                  <span className="inline-flex items-center gap-2 text-neutral-300">
                    { !(((rel ? `${rel}/${e.name}` : e.name).toLowerCase().endsWith('.jar') || (rel ? `${rel}/${e.name}` : e.name).toLowerCase().endsWith('.zip') || (rel ? `${rel}/${e.name}` : e.name).toLowerCase().endsWith('.rar') || (rel ? `${rel}/${e.name}` : e.name).toLowerCase().endsWith('.log.gz'))) && (                      <button
                        title="View"
                        onClick={async () => {
                          try {
                            const fileRel = rel ? `${rel}/${e.name}` : e.name;
                            const res = await fetch(`/api/mc-file?path=${encodeURIComponent(fileRel)}`);
                            if (!res.ok) throw new Error('Failed to load file');
                            const data = await res.json();
                            setViewingPath(fileRel);
                            setViewingContent(data.content ?? "");
                          } catch (err) {
                            console.error(err);
                            alert('Failed to load file');
                          }
                        }}
                        className="hover:text-white"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      title="Download"
                      onClick={async () => {
                        const fileRel = rel ? `${rel}/${e.name}` : e.name;
                        const url = `/api/mc-file?path=${encodeURIComponent(fileRel)}&download=1`;
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = e.name;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                      }}
                      className="hover:text-white"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    { !(((rel ? `${rel}/${e.name}` : e.name).toLowerCase().endsWith('.jar') || (rel ? `${rel}/${e.name}` : e.name).toLowerCase().endsWith('.zip') || (rel ? `${rel}/${e.name}` : e.name).toLowerCase().endsWith('.rar') || (rel ? `${rel}/${e.name}` : e.name).toLowerCase().endsWith('.log.gz'))) && (                      <button
                        title={serverBusy ? "Edit disabled while server is running" : "Edit"}
                        disabled={serverBusy}
                        onClick={async () => {
                          if (serverBusy) {
                            showToast('Edit is disabled while server is running', 'info');
                            return;
                          }
                          try {
                            const fileRel = rel ? `${rel}/${e.name}` : e.name;
                            const res = await fetch(`/api/mc-file?path=${encodeURIComponent(fileRel)}`);
                            if (!res.ok) throw new Error('Failed to load file');
                            const data = await res.json();
                            setEditingPath(fileRel);
                            setEditingContent(data.content ?? "");
                          } catch (err) {
                            console.error(err);
                            alert('Failed to load file');
                          }
                        }}
                        className={serverBusy ? "text-neutral-600 cursor-not-allowed" : "hover:text-white"}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      title={serverBusy ? "Delete disabled while server is running" : "Delete"}
                      disabled={serverBusy}
                      onClick={() => {
                        if (serverBusy) {
                          showToast('Delete is disabled while server is running', 'info');
                          return;
                        }
                        const fileRel = rel ? `${rel}/${e.name}` : e.name;
                        setDeletingPath(fileRel);
                      }}
                      className={serverBusy ? "text-neutral-600 cursor-not-allowed" : "hover:text-white"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                </div>
              </div>
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
                    className="flex-1 p-3 bg-neutral-950 text-neutral-100 outline-none resize-none"
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
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/mc-file', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ path: editingPath, content: editingContent })
                          });
                          if (!res.ok) throw new Error('Save failed');
                          setEditingPath(null);
                          showToast('Saved successfully', 'success');
                        } catch (err) {
                          console.error(err);
                          alert('Failed to save file');
                        }
                      }}
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
                  <pre className="flex-1 p-3 bg-neutral-950 text-neutral-100 overflow-auto whitespace-pre-wrap break-words">{viewingContent}</pre>
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
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/mc-file?path=${encodeURIComponent(deletingPath!)}`, { method: 'DELETE' });
                          if (!res.ok) throw new Error('Delete failed');
                          setDeletingPath(null);
                          showToast('Deleted successfully', 'success');
                          // refresh listing
                          const qs = rel ? `?path=${encodeURIComponent(rel)}` : "";
                          const res2 = await fetch(`/api/list-mc${qs}`);
                          const data2 = await res2.json();
                          setEntries(data2.entries || []);
                        } catch (err) {
                          console.error(err);
                          alert('Failed to delete');
                        }
                      }}
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

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

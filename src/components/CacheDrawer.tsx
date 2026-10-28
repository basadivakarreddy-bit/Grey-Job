import React from 'react';
import { X, Trash2, ExternalLink, Copy, Check, HardDrive, AlertCircle, Lock, ShieldAlert, Loader2 } from 'lucide-react';
import { CachedDocument } from '../types';
import { copyToClipboard } from '../utils/clipboard';

interface CacheDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cachedDocs: CachedDocument[];
  onSelectDoc: (path: string) => void;
  onDeleteDoc: (slug: string) => void;
  onClearAll: () => void;
}

export const CacheDrawer: React.FC<CacheDrawerProps> = ({
  isOpen,
  onClose,
  cachedDocs,
  onSelectDoc,
  onDeleteDoc,
  onClearAll,
}) => {
  const [copiedSlug, setCopiedSlug] = React.useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = React.useState<boolean>(false);
  const [passwordInput, setPasswordInput] = React.useState<string>('');
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [isResetting, setIsResetting] = React.useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = React.useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopy = async (slug: string, content: string) => {
    const res = await copyToClipboard(content);
    if (res.success) {
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    }
  };

  const totalCharacters = cachedDocs.reduce((acc, d) => acc + (d.contentLength || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 h-full shadow-2xl flex flex-col border-l border-neutral-200 dark:border-neutral-800">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            <h2 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
              Offline IndexedDB Cache
            </h2>
            <span className="text-xs text-neutral-500 font-mono">
              ({cachedDocs.length})
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info notice */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-neutral-800 dark:text-neutral-200">How offline works: </span>
            When you visit or create documents online, they are saved locally. You can access their <span className="font-mono">/c/</span> and <span className="font-mono">/p/</span> routes even when disconnected.
          </div>
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cachedDocs.length === 0 ? (
            <div className="text-center py-12 text-neutral-400 text-xs">
              No documents cached in IndexedDB yet.
              <br />
              Open or create any document to cache it locally.
            </div>
          ) : (
            cachedDocs.map((doc) => (
              <div
                key={doc.slug}
                className="p-3 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-50/50 dark:bg-neutral-800/30 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    /{doc.slug}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleCopy(doc.slug, doc.content)}
                      className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-700 rounded transition-colors"
                      title="Copy content to clipboard"
                    >
                      {copiedSlug === doc.slug ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        onSelectDoc(`/c/${doc.slug}`);
                        onClose();
                      }}
                      className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-700 rounded transition-colors"
                      title="Open /c/ document view"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteDoc(doc.slug)}
                      className="p-1.5 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-700 rounded transition-colors"
                      title="Remove from offline cache"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-1 text-xs text-neutral-500 font-mono flex items-center gap-2">
                  <span>{doc.contentLength.toLocaleString()} chars</span>
                  <span>·</span>
                  <span>
                    Cached{' '}
                    {new Date(doc.cachedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => {
                      onSelectDoc(`/p/${doc.slug}`);
                      onClose();
                    }}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-200/70 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                  >
                    Dinosaur Copy (/p/{doc.slug})
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 space-y-2 text-xs text-neutral-500">
          <div className="flex items-center justify-between">
            <span>Local Cache: {cachedDocs.length} items ({totalCharacters.toLocaleString()} chars)</span>
            {cachedDocs.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-rose-600 dark:text-rose-400 hover:underline transition-colors"
              >
                Clear Cache
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
            <span className="font-mono text-[11px] text-neutral-400">Server Database</span>
            <button
              onClick={() => {
                setPasswordInput('');
                setPasswordError(null);
                setResetSuccess(false);
                setShowPasswordModal(true);
              }}
              className="text-rose-600 dark:text-rose-400 hover:text-rose-700 font-mono text-[11px] hover:underline cursor-pointer"
            >
              Reset Server DB
            </button>
          </div>
        </div>

        {/* Password Required Reset Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  <Lock className="w-4 h-4 text-rose-600" />
                  <span>Admin Password Required</span>
                </div>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {resetSuccess ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Database reset successfully. Reloading page...</span>
                </div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!passwordInput.trim()) {
                      setPasswordError('Password cannot be empty.');
                      return;
                    }
                    setIsResetting(true);
                    setPasswordError(null);
                    try {
                      const res = await fetch('/api/admin/reset-database', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password: passwordInput }),
                      });
                      const data = await res.json();
                      if (res.ok && data.success) {
                        setResetSuccess(true);
                        setTimeout(() => {
                          window.location.reload();
                        }, 1200);
                      } else {
                        setPasswordError(data.error || 'Invalid password. Authorization failed.');
                      }
                    } catch {
                      setPasswordError('Network error: Could not reach the server.');
                    } finally {
                      setIsResetting(false);
                    }
                  }}
                  className="space-y-3"
                >
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    To restart and reseed the server database, enter the administrator password:
                  </p>

                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    placeholder="Enter admin password..."
                    autoFocus
                    className="w-full px-3 py-2 text-xs font-mono rounded-md bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100"
                  />

                  {passwordError && (
                    <div className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-mono">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(false)}
                      className="px-3 py-1.5 rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isResetting || !passwordInput}
                      className="flex items-center gap-1.5 px-4 py-1.5 font-medium rounded-md bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-xs"
                    >
                      {isResetting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <span>Verify & Reset</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

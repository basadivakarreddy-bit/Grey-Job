import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  Calendar,
  ExternalLink,
  Plus,
  Download,
  AlertCircle,
  Loader2,
  HardDrive,
  Share2,
  QrCode,
  Search,
  AlignLeft,
  FileText,
  X,
} from 'lucide-react';
import { JobingDocument } from '../types';
import { copyToClipboard } from '../utils/clipboard';
import { getDocumentFromCache, saveDocumentToCache } from '../utils/idb';
import { QRModal } from '../components/QRModal';

interface DocumentViewProps {
  slug: string;
  onNavigate: (path: string) => void;
  onForkDocument: (content: string) => void;
}

export const DocumentView: React.FC<DocumentViewProps> = ({
  slug,
  onNavigate,
  onForkDocument,
}) => {
  const [docData, setDocData] = useState<JobingDocument | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedContent, setCopiedContent] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isOfflineCached, setIsOfflineCached] = useState<boolean>(false);

  // New UI features
  const [showLineNumbers, setShowLineNumbers] = useState<boolean>(true);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDocument() {
      setIsLoading(true);
      setNotFound(false);
      setErrorMessage(null);

      const normalizedSlug = slug.toLowerCase().trim();

      // Check online API first
      try {
        const res = await fetch(`/api/documents/${normalizedSlug}`);
        const data = await res.json();

        if (res.status === 404) {
          // If 404 on network, check if we have a locally cached version in IndexedDB
          const cached = await getDocumentFromCache(normalizedSlug);
          if (cached && isMounted) {
            setDocData({
              id: cached.id || 'cached-id',
              slug: cached.slug,
              content: cached.content,
              contentLength: cached.contentLength,
              createdAt: cached.createdAt,
              updatedAt: cached.updatedAt || cached.createdAt,
              isOfflineCache: true,
            });
            setIsOfflineCached(true);
            setIsLoading(false);
            return;
          }

          if (isMounted) {
            setNotFound(true);
            setIsLoading(false);
          }
          return;
        }

        if (res.ok && data.success && isMounted) {
          const doc: JobingDocument = data.document;
          setDocData(doc);
          setIsOfflineCached(false);

          // Update IndexedDB cache for offline access
          await saveDocumentToCache({
            slug: doc.slug,
            id: doc.id,
            content: doc.content,
            contentLength: doc.contentLength,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
          });

          setIsLoading(false);
          return;
        }

        throw new Error(data.error || 'Server error');
      } catch (err) {
        // Network or server failed; attempt fallback to IndexedDB!
        try {
          const cached = await getDocumentFromCache(normalizedSlug);
          if (cached && isMounted) {
            setDocData({
              id: cached.id || 'cached-id',
              slug: cached.slug,
              content: cached.content,
              contentLength: cached.contentLength,
              createdAt: cached.createdAt,
              updatedAt: cached.updatedAt || cached.createdAt,
              isOfflineCache: true,
            });
            setIsOfflineCached(true);
            setIsLoading(false);
            return;
          }
        } catch {
          // IndexedDB failed as well
        }

        if (isMounted) {
          setErrorMessage(
            'Unable to reach the server, and no cached copy is available in your browser.'
          );
          setIsLoading(false);
        }
      }
    }

    loadDocument();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleCopyContent = async () => {
    if (!docData) return;
    const res = await copyToClipboard(docData.content);
    if (res.success) {
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 2000);
      // increment server metrics asynchronously
      fetch(`/api/documents/${docData.slug}/copy`, { method: 'POST' }).catch(() => {});
    }
  };

  const handleCopyLink = async () => {
    const url = window.location.href;
    const res = await copyToClipboard(url);
    if (res.success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!docData) return;
    const blob = new Blob([docData.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${docData.slug}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 flex flex-col items-center justify-center text-center space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        <p className="text-xs font-mono text-neutral-500">Loading document /{slug}...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 font-mono text-lg font-bold">
          404
        </div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Document Not Found
        </h2>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-mono">
          The document at <span className="font-bold text-neutral-900 dark:text-neutral-100">/c/{slug}</span> does not exist or has expired.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('/c/')}
            className="px-4 py-2 text-xs font-medium rounded-md bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white transition-colors"
          >
            Create New Document
          </button>
        </div>
      </div>
    );
  }

  if (errorMessage && !docData) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 space-y-4">
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-2 text-xs text-amber-900 dark:text-amber-200">
            <h3 className="font-semibold text-sm">Connection Unavailable</h3>
            <p>{errorMessage}</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              Note: Uncached documents cannot be fetched while disconnected from the network.
            </p>
          </div>
        </div>
        <div className="flex justify-center">
          <button
            onClick={() => onNavigate('/c/')}
            className="px-4 py-2 text-xs font-medium rounded-md bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900"
          >
            Go to Editor
          </button>
        </div>
      </div>
    );
  }

  if (!docData) return null;

  const formattedDate = new Date(docData.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lines = docData.content.split('\n');
  const words = docData.content.trim() ? docData.content.trim().split(/\s+/).length : 0;

  // Search match count
  const searchMatches = searchQuery.trim()
    ? (docData.content.match(new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      {/* Offline cached notification banner */}
      {isOfflineCached && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-lg flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-amber-600" />
            <span>Viewing locally cached IndexedDB copy (Offline mode)</span>
          </div>
          <span className="font-mono text-[11px] text-amber-700/80">Cached copy</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-base font-semibold text-neutral-900 dark:text-neutral-100">
              /{docData.slug}
            </h1>
            <span className="text-neutral-400">·</span>
            <span className="text-xs font-mono text-neutral-500">
              {docData.contentLength.toLocaleString()} chars
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1 font-mono">
            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
            <span>{formattedDate}</span>
            <span>·</span>
            <span>{words.toLocaleString()} words</span>
            <span>·</span>
            <span>{lines.length.toLocaleString()} lines</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* One-click copy content */}
          <button
            onClick={handleCopyContent}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white transition-colors shadow-xs"
            title="Copy entire document content to clipboard"
          >
            {copiedContent ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Content</span>
              </>
            )}
          </button>

          {/* Dinosaur screen link */}
          <button
            onClick={() => onNavigate(`/p/${docData.slug}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Open minimal dinosaur copy page"
          >
            <span>Dinosaur /p/</span>
            <ExternalLink className="w-3 h-3 text-neutral-400" />
          </button>

          {/* QR Code button */}
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Scan QR Code to open on mobile"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">QR</span>
          </button>

          {/* Copy link */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Copy public link"
          >
            {copiedLink ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Search inside doc toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1.5 rounded-md border transition-colors ${
              showSearch
                ? 'bg-neutral-200 dark:bg-neutral-700 border-neutral-400 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100'
                : 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title="Find text in document"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Line Numbers Toggle */}
          <button
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className={`p-1.5 rounded-md border transition-colors ${
              showLineNumbers
                ? 'bg-neutral-200 dark:bg-neutral-700 border-neutral-400 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100'
                : 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title="Toggle line numbers"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>

          {/* Raw Text link */}
          <a
            href={`/api/documents/${docData.slug}/raw`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="View pure raw text (curl-friendly)"
          >
            <FileText className="w-3.5 h-3.5" />
          </a>

          {/* Fork as new */}
          <button
            onClick={() => onForkDocument(docData.content)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Fork content into editor as a new document"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fork</span>
          </button>

          {/* Download txt */}
          <button
            onClick={handleDownload}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Download as .txt"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      {showSearch && (
        <div className="p-2.5 bg-neutral-100 dark:bg-neutral-800/80 rounded-lg flex items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-3.5 h-3.5 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find in document..."
              autoFocus
              className="w-full bg-transparent outline-none text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 font-mono text-xs"
            />
          </div>
          {searchQuery && (
            <span className="text-[11px] font-mono text-neutral-500 shrink-0">
              {searchMatches} {searchMatches === 1 ? 'match' : 'matches'}
            </span>
          )}
          <button
            onClick={() => {
              setSearchQuery('');
              setShowSearch(false);
            }}
            className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Preformatted Text Display: Pure text, strictly no HTML evaluation */}
      <div className="border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 shadow-2xs overflow-hidden flex flex-col">
        <div className="flex overflow-x-auto">
          {/* Gutter Line Numbers */}
          {showLineNumbers && (
            <div
              aria-hidden="true"
              className="py-4 pl-3 pr-2 bg-neutral-50/70 dark:bg-neutral-800/40 border-r border-neutral-200 dark:border-neutral-800 select-none text-right font-mono text-[12px] leading-relaxed text-neutral-400 dark:text-neutral-600 shrink-0"
              style={{ minWidth: '3.2rem' }}
            >
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
          )}

          {/* Text Content */}
          <div className="p-4 sm:p-6 flex-1 overflow-x-auto">
            <pre
              tabIndex={0}
              className="font-mono text-[13px] leading-relaxed text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap break-words select-text outline-none focus:ring-1 focus:ring-neutral-400 rounded"
            >
              {searchQuery.trim() ? (
                // Highlight search matches safely with text segments
                lines.map((line, lIdx) => {
                  if (!line.toLowerCase().includes(searchQuery.toLowerCase())) {
                    return <div key={lIdx}>{line || '\n'}</div>;
                  }
                  const parts = line.split(new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
                  return (
                    <div key={lIdx}>
                      {parts.map((part, pIdx) =>
                        part.toLowerCase() === searchQuery.toLowerCase() ? (
                          <mark
                            key={pIdx}
                            className="bg-amber-300 dark:bg-amber-600 text-neutral-900 dark:text-white rounded-2xs px-0.5"
                          >
                            {part}
                          </mark>
                        ) : (
                          <span key={pIdx}>{part}</span>
                        )
                      )}
                    </div>
                  );
                })
              ) : (
                docData.content
              )}
            </pre>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500 font-mono flex items-center justify-between">
          <span>Rendered as pure raw text · XSS protected</span>
          <span>{docData.contentLength.toLocaleString()} characters</span>
        </div>
      </div>

      {/* QR Code Modal */}
      <QRModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        title={`/c/${docData.slug}`}
        url={window.location.href}
      />
    </div>
  );
};

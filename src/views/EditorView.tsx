import React, { useState, useEffect, useRef } from 'react';
import {
  Share2,
  Copy,
  Trash2,
  Sparkles,
  Check,
  AlertTriangle,
  Code2,
  Type,
  ExternalLink,
  ArrowRight,
  Loader2,
  AlignLeft,
  Braces,
  CheckCircle2,
  XCircle,
  WrapText,
  FileCode,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';
import { saveDocumentToCache } from '../utils/idb';

interface EditorViewProps {
  onNavigate: (path: string) => void;
  onDocumentCreated: (slug: string) => void;
  initialContent?: string;
}

const MAX_CHARACTERS = 100000;

const TEMPLATES: { label: string; content: string }[] = [
  {
    label: 'Python',
    content: `# Python Snippet\ndef calculate_metrics(items: list[int]) -> dict:\n    """Computes basic statistical metrics."""\n    if not items:\n        return {"count": 0, "sum": 0, "avg": 0.0}\n    return {\n        "count": len(items),\n        "sum": sum(items),\n        "avg": sum(items) / len(items),\n    }\n\nif __name__ == "__main__":\n    data = [10, 20, 30, 40, 50]\n    print("Metrics:", calculate_metrics(data))\n`,
  },
  {
    label: 'JSON',
    content: `{\n  "service": "grey-job",\n  "version": "1.0.0",\n  "offlineEnabled": true,\n  "features": [\n    "instant-copy",\n    "dinosaur-screen",\n    "indexeddb-cache",\n    "custom-slugs"\n  ],\n  "limits": {\n    "maxCharacters": 100000\n  }\n}\n`,
  },
  {
    label: 'Markdown',
    content: `# Meeting Notes & Action Items\n\n## Discussion Points\n- [x] Initial design review of offline clipboard\n- [ ] Database sync and indexing performance\n- [ ] Mobile QR code access flow\n\n> Note: All documents remain available in IndexedDB offline cache.\n`,
  },
  {
    label: 'Shell',
    content: `#!/usr/bin/env bash\n# grey-job backup and test script\nset -euo pipefail\n\necho "Checking health..."\ncurl -s http://localhost:3000/api/health | jq .\n\necho "Job complete!"\n`,
  },
  {
    label: '.env',
    content: `# Application Configuration\nAPP_NAME="grey-job"\nPORT=3000\nNODE_ENV="production"\nSTORAGE_MODE="sqlite-wal"\nCACHE_TTL=604800\n`,
  },
];

export const EditorView: React.FC<EditorViewProps> = ({
  onNavigate,
  onDocumentCreated,
  initialContent = '',
}) => {
  const [content, setContent] = useState<string>(initialContent);
  const [slug, setSlug] = useState<string>('');
  const [isMonospace, setIsMonospace] = useState<boolean>(true);
  const [showLineNumbers, setShowLineNumbers] = useState<boolean>(true);
  const [wordWrap, setWordWrap] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const [slugStatus, setSlugStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');
  const [slugStatusMessage, setSlugStatusMessage] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdDoc, setCreatedDoc] = useState<{
    slug: string;
    url: string;
    copyUrl: string;
  } | null>(null);
  const [copiedContent, setCopiedContent] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [copiedCopyUrl, setCopiedCopyUrl] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Check unsaved changes on tab close / reload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (content.trim().length > 0 && !createdDoc) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [content, createdDoc]);

  // Focus textarea on initial mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Sync line numbers scrolling with textarea
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Debounced slug availability checker
  useEffect(() => {
    const trimmed = slug.trim().toLowerCase();
    if (!trimmed) {
      setSlugStatus('idle');
      setSlugStatusMessage(null);
      return;
    }

    if (!/^[a-z0-9_-]{2,64}$/.test(trimmed)) {
      setSlugStatus('invalid');
      setSlugStatusMessage('2-64 chars: a-z, 0-9, -');
      return;
    }

    setSlugStatus('checking');
    setSlugStatusMessage('Checking...');

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/documents/check/${trimmed}`);
        const data = await res.json();
        if (data.available) {
          setSlugStatus('available');
          setSlugStatusMessage('Available');
        } else {
          setSlugStatus('taken');
          setSlugStatusMessage('Already in use');
        }
      } catch {
        setSlugStatus('idle');
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [slug]);

  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const lines = content.split('\n');
  const lineCount = content ? lines.length : 1;
  const charPercentage = Math.min(100, Math.round((charCount / MAX_CHARACTERS) * 100));

  // Cryptographically random slug helper
  const handleGenerateRandomSlug = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let rand = '';
    const array = new Uint8Array(6);
    crypto.getRandomValues(array);
    for (let i = 0; i < 6; i++) {
      rand += chars[array[i] % chars.length];
    }
    setSlug(rand);
    setErrorMessage(null);
  };

  const handleClear = () => {
    if (content.trim().length === 0) return;
    if (content.length > 50) {
      setShowClearConfirm(true);
    } else {
      setContent('');
      setCreatedDoc(null);
      setErrorMessage(null);
    }
  };

  const confirmClear = () => {
    setContent('');
    setSlug('');
    setCreatedDoc(null);
    setErrorMessage(null);
    setShowClearConfirm(false);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleCopyContent = async () => {
    if (!content) return;
    const res = await copyToClipboard(content);
    if (res.success) {
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 2000);
    }
  };

  // Format JSON helper
  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(content);
      const formatted = JSON.stringify(parsed, null, 2);
      setContent(formatted);
      setErrorMessage(null);
    } catch {
      setErrorMessage('Content is not valid JSON and cannot be auto-formatted.');
    }
  };

  const isContentValidJson = (() => {
    if (!content || content.length > 20000) return false;
    const trimmed = content.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false;
    try {
      JSON.parse(trimmed);
      return true;
    } catch {
      return false;
    }
  })();

  // Handle Tab key indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleCreateShare();
      return;
    }

    // Tab key: insert 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const spaces = '  ';
      const updated = content.substring(0, start) + spaces + content.substring(end);
      setContent(updated);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + spaces.length;
      }, 0);
    }
  };

  const handleCreateShare = async () => {
    if (!content || content.trim().length === 0) {
      setErrorMessage('Please paste or type some text before sharing.');
      return;
    }

    if (content.length > MAX_CHARACTERS) {
      setErrorMessage(
        `Content exceeds maximum limit of ${MAX_CHARACTERS.toLocaleString()} characters.`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          slug: slug.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Failed to save document. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const assignedSlug = data.document.slug;
      const origin = window.location.origin;
      const publicUrl = `${origin}/c/${assignedSlug}`;
      const copyUrl = `${origin}/p/${assignedSlug}`;

      // Automatically cache into IndexedDB immediately!
      await saveDocumentToCache({
        slug: assignedSlug,
        id: data.document.id,
        content,
        contentLength: content.length,
        createdAt: data.document.createdAt,
      });

      setCreatedDoc({
        slug: assignedSlug,
        url: publicUrl,
        copyUrl: copyUrl,
      });

      onDocumentCreated(assignedSlug);
    } catch (err: unknown) {
      console.error('Error creating share:', err);
      setErrorMessage(
        'Network error: Unable to reach the server. Please check your connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const fontClass =
    fontSize === 'sm' ? 'text-xs' : fontSize === 'lg' ? 'text-base' : 'text-[13px]';
  const fontPx = fontSize === 'sm' ? 12 : fontSize === 'lg' ? 15 : 13;
  const editorFontFamily = isMonospace
    ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
    : 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-3">
      {/* Templates & Quick Starters Bar */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs text-neutral-500 font-mono scrollbar-none">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold select-none flex items-center gap-1">
            <FileCode className="w-3.5 h-3.5" />
            <span>Templates:</span>
          </span>
          {TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.label}
              type="button"
              onClick={() => {
                setContent(tmpl.content);
                setErrorMessage(null);
                setCreatedDoc(null);
              }}
              className="px-2 py-0.5 rounded text-[11px] bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
            >
              {tmpl.label}
            </button>
          ))}
        </div>

        {/* Format JSON button if detected */}
        {isContentValidJson && (
          <button
            type="button"
            onClick={handleFormatJson}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-neutral-700 dark:text-neutral-300 bg-neutral-200/80 dark:bg-neutral-700 hover:bg-neutral-300 transition-colors shrink-0"
            title="Auto-format JSON with 2 spaces"
          >
            <Braces className="w-3 h-3" />
            <span>Format JSON</span>
          </button>
        )}
      </div>

      {/* Top Options Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Slug input & randomize */}
        <div className="flex items-center gap-2 flex-1 min-w-[300px]">
          <span className="font-mono text-neutral-400 select-none">grey-job/c/</span>
          <div className="relative flex-1">
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
                setErrorMessage(null);
              }}
              placeholder="custom-slug (optional)"
              maxLength={64}
              className="w-full px-2.5 py-1.5 font-mono text-xs rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-200 transition-colors pr-24"
            />

            {/* Slug status badge */}
            {slugStatus !== 'idle' && (
              <div className="absolute right-2 top-1.5 flex items-center gap-1 font-mono text-[10px]">
                {slugStatus === 'checking' && (
                  <span className="text-neutral-400">Checking...</span>
                )}
                {slugStatus === 'available' && (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Available</span>
                  </span>
                )}
                {slugStatus === 'taken' && (
                  <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                    <XCircle className="w-3 h-3" />
                    <span>Taken</span>
                  </span>
                )}
                {slugStatus === 'invalid' && (
                  <span className="text-amber-600 dark:text-amber-400">Invalid</span>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleGenerateRandomSlug}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-mono transition-colors"
            title="Generate a cryptographically random slug"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Random</span>
          </button>
        </div>

        {/* View toggles & actions */}
        <div className="flex items-center gap-1">
          {/* Monospace Toggle */}
          <button
            type="button"
            onClick={() => setIsMonospace(!isMonospace)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-md font-mono transition-colors ${
              isMonospace
                ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 font-semibold'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title="Toggle Monospace / Sans font"
          >
            {isMonospace ? <Code2 className="w-3.5 h-3.5" /> : <Type className="w-3.5 h-3.5" />}
            <span>{isMonospace ? 'Mono' : 'Sans'}</span>
          </button>

          {/* Line Numbers Toggle */}
          <button
            type="button"
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-md font-mono transition-colors ${
              showLineNumbers
                ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 font-semibold'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title="Toggle line numbers gutter"
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Lines</span>
          </button>

          {/* Word Wrap Toggle */}
          <button
            type="button"
            onClick={() => setWordWrap(!wordWrap)}
            className={`p-1.5 rounded-md transition-colors ${
              wordWrap
                ? 'text-neutral-900 dark:text-neutral-100 bg-neutral-200 dark:bg-neutral-700'
                : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title={wordWrap ? 'Wrap lines enabled' : 'Horizontal code scroll enabled'}
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>

          {/* Font Size Selector */}
          <div className="hidden sm:flex items-center p-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-mono text-[10px]">
            <button
              onClick={() => setFontSize('sm')}
              className={`px-1.5 py-0.5 rounded ${fontSize === 'sm' ? 'bg-white dark:bg-neutral-700 font-bold shadow-2xs' : 'text-neutral-500'}`}
            >
              A-
            </button>
            <button
              onClick={() => setFontSize('base')}
              className={`px-1.5 py-0.5 rounded ${fontSize === 'base' ? 'bg-white dark:bg-neutral-700 font-bold shadow-2xs' : 'text-neutral-500'}`}
            >
              A
            </button>
            <button
              onClick={() => setFontSize('lg')}
              className={`px-1.5 py-0.5 rounded ${fontSize === 'lg' ? 'bg-white dark:bg-neutral-700 font-bold shadow-2xs' : 'text-neutral-500'}`}
            >
              A+
            </button>
          </div>

          {/* Expand/Contract Height Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1.5 rounded-md transition-colors ${
              isExpanded
                ? 'text-neutral-900 dark:text-neutral-100 bg-neutral-200 dark:bg-neutral-700'
                : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title={isExpanded ? 'Contract editor height' : 'Extend editor to max lines (fullscreen height)'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Copy Text */}
          <button
            type="button"
            onClick={handleCopyContent}
            disabled={!content}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 transition-colors"
            title="Copy editor content to clipboard"
          >
            {copiedContent ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Copy</span>
          </button>

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            disabled={!content}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 transition-colors"
            title="Clear editor"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Textarea Container with Line Numbers */}
      <div className="relative border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-neutral-900 dark:focus-within:ring-neutral-100 transition-all flex flex-col">
        {/* Extended Textarea & Line Numbers Container */}
        <div
          className={`relative flex flex-1 overflow-hidden transition-all duration-200 h-[450px] min-h-[450px]`}
        >
          {/* Line Numbers Gutter */}
          {showLineNumbers && (
            <div
              ref={lineNumbersRef}
              onWheel={(e) => {
                if (textareaRef.current) {
                  textareaRef.current.scrollTop += e.deltaY;
                }
              }}
              aria-hidden="true"
              className="bg-neutral-50/90 dark:bg-neutral-800/60 border-r border-neutral-200 dark:border-neutral-800 select-none text-right text-neutral-400 dark:text-neutral-500 overflow-hidden shrink-0"
              style={{
                height: '450px',
                minHeight: '450px',
                minWidth: lineCount > 999 ? '3.8rem' : '3.2rem',
                paddingTop: '12px',
                paddingBottom: '64px',
                paddingLeft: '12px',
                paddingRight: '10px',
                boxSizing: 'border-box',
                margin: 0,
                fontSize: `${fontPx}px`,
                fontFamily: editorFontFamily,
                lineHeight: '24px',
              }}
            >
              {Array.from({ length: lineCount }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: '24px',
                    lineHeight: '24px',
                    fontSize: `${fontPx}px`,
                    fontFamily: editorFontFamily,
                    boxSizing: 'border-box',
                    margin: 0,
                    padding: 0,
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          )}

          {/* Core Extended Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            placeholder="Paste or type anything here... (source code, notes, config files, passwords, logs, drafts)&#10;&#10;Press Tab to indent with spaces.&#10;Press Ctrl+Enter to save."
            className={`flex-1 w-full h-full bg-transparent text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none resize-none selection:bg-neutral-200 dark:selection:bg-neutral-700 overflow-y-auto scrollbar-thin ${
              wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-x-auto'
            }`}
            style={{
              height: '450px',
              minHeight: '450px',
              lineHeight: '24px',
              fontSize: `${fontPx}px`,
              fontFamily: editorFontFamily,
              paddingTop: '12px',
              paddingBottom: '64px',
              paddingLeft: '16px',
              paddingRight: '16px',
              boxSizing: 'border-box',
              margin: 0,
              border: 'none',
              tabSize: 2,
            }}
            spellCheck={false}
          />
        </div>

        {/* Bottom bar inside editor */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500 font-mono">
          <div className="flex items-center gap-3">
            <span>{charCount.toLocaleString()} chars</span>
            <span>·</span>
            <span>{wordCount.toLocaleString()} words</span>
            <span>·</span>
            <span>{lineCount.toLocaleString()} lines</span>
            <span>·</span>
            <span className="hidden sm:inline">Tab = 2 spaces</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={
                charCount > MAX_CHARACTERS
                  ? 'text-rose-600 font-bold'
                  : charCount > MAX_CHARACTERS * 0.9
                  ? 'text-amber-600'
                  : 'text-neutral-400'
              }
            >
              {charCount.toLocaleString()} / {MAX_CHARACTERS.toLocaleString()}
            </span>
            <div className="w-16 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  charCount > MAX_CHARACTERS
                    ? 'bg-rose-500'
                    : charCount > MAX_CHARACTERS * 0.9
                    ? 'bg-amber-500'
                    : 'bg-neutral-700 dark:bg-neutral-300'
                }`}
                style={{ width: `${charPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error state alert */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-lg flex items-start gap-2 text-xs text-rose-800 dark:text-rose-300 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
        </div>
      )}

      {/* Success Banner when document is created */}
      {createdDoc && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-lg space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Document successfully saved & cached locally!</span>
            </div>
            <button
              onClick={() => onNavigate(`/c/${createdDoc.slug}`)}
              className="text-xs font-medium text-emerald-800 dark:text-emerald-300 hover:underline flex items-center gap-1"
            >
              <span>View Document</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Public Link */}
            <div className="p-2.5 bg-white dark:bg-neutral-900 rounded border border-emerald-200/80 dark:border-emerald-900/40 flex items-center justify-between gap-2">
              <div className="truncate">
                <div className="text-[10px] text-neutral-400 font-mono uppercase">Public Share URL</div>
                <div className="font-mono text-neutral-900 dark:text-neutral-100 truncate">
                  /c/{createdDoc.slug}
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await copyToClipboard(createdDoc.url);
                  setCopiedUrl(true);
                  setTimeout(() => setCopiedUrl(false), 2000);
                }}
                className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
                title="Copy public URL"
              >
                {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Dinosaur Copy Link */}
            <div className="p-2.5 bg-white dark:bg-neutral-900 rounded border border-emerald-200/80 dark:border-emerald-900/40 flex items-center justify-between gap-2">
              <div className="truncate">
                <div className="text-[10px] text-neutral-400 font-mono uppercase">Dinosaur Copy URL</div>
                <div className="font-mono text-neutral-900 dark:text-neutral-100 truncate">
                  /p/{createdDoc.slug}
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await copyToClipboard(createdDoc.copyUrl);
                  setCopiedCopyUrl(true);
                  setTimeout(() => setCopiedCopyUrl(false), 2000);
                }}
                className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
                title="Copy dinosaur URL"
              >
                {copiedCopyUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Submit Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="text-xs text-neutral-500 font-mono">
          <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-[10px]">
            Ctrl
          </kbd>
          {' + '}
          <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-[10px]">
            Enter
          </kbd>
          {' to save'}
        </div>

        <div className="flex items-center gap-2">
          {createdDoc ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setCreatedDoc(null);
                  setContent('');
                  setSlug('');
                }}
                className="px-4 py-2 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                New Document
              </button>
              <button
                type="button"
                onClick={() => onNavigate(`/p/${createdDoc.slug}`)}
                className="px-4 py-2 text-xs font-medium rounded-md bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <span>Open Dinosaur Screen</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleCreateShare}
              disabled={isSubmitting || !content || content.trim().length === 0}
              className="px-6 py-2.5 text-xs font-medium rounded-md bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white disabled:opacity-50 transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Create Share</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Clearing large text */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-5 max-w-sm w-full border border-neutral-200 dark:border-neutral-800 shadow-xl space-y-4">
            <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
              Clear document?
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              You have {charCount.toLocaleString()} characters in the editor. Are you sure you want to discard this content?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 text-xs rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmClear}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-rose-600 text-white hover:bg-rose-700"
              >
                Yes, Clear Text
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

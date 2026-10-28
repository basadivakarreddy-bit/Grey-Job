import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { EditorView } from './views/EditorView';
import { DocumentView } from './views/DocumentView';
import { CopyDinosaurView } from './views/CopyDinosaurView';
import { CacheDrawer } from './components/CacheDrawer';
import { TestRunnerModal } from './components/TestRunnerModal';
import {
  getAllCachedDocuments,
  deleteDocumentFromCache,
  clearAllCachedDocuments,
} from './utils/idb';
import { CachedDocument } from './types';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/c/');
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('jobing_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  const [cachedDocs, setCachedDocs] = useState<CachedDocument[]>([]);
  const [isCacheDrawerOpen, setIsCacheDrawerOpen] = useState<boolean>(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [forkedContent, setForkedContent] = useState<string>('');

  // Apply dark mode class to root html element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('jobing_theme', isDark ? 'dark' : 'light');
    } catch {}
  }, [isDark]);

  // Register Service Worker for true offline shell caching
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Jobing Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('Jobing Service Worker registration failed:', err);
        });
    }
  }, []);

  // Sync route on popstate (browser back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/c/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Refresh cached docs list periodically and on focus
  const refreshCacheList = useCallback(async () => {
    try {
      const docs = await getAllCachedDocuments();
      setCachedDocs(docs);
    } catch (err) {
      console.warn('Error loading cached documents:', err);
    }
  }, []);

  useEffect(() => {
    refreshCacheList();
    window.addEventListener('focus', refreshCacheList);
    return () => window.removeEventListener('focus', refreshCacheList);
  }, [refreshCacheList]);

  const navigateTo = (path: string) => {
    if (path === window.location.pathname) return;
    window.history.pushState(null, '', path);
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const handleDocumentCreated = (slug: string) => {
    refreshCacheList();
  };

  const handleForkDocument = (content: string) => {
    setForkedContent(content);
    navigateTo('/c/');
  };

  const handleDeleteCachedDoc = async (slug: string) => {
    await deleteDocumentFromCache(slug);
    refreshCacheList();
  };

  const handleClearAllCache = async () => {
    await clearAllCachedDocuments();
    refreshCacheList();
  };

  // Route Parsing
  // Normalizes path: /c/slug, /c, /p/slug, /
  const cleanPath = currentPath.replace(/\/+$/, '') || '/';
  const cMatch = cleanPath.match(/^\/c(?:\/([a-zA-Z0-9_-]+))?$/);
  const pMatch = cleanPath.match(/^\/p\/([a-zA-Z0-9_-]+)$/);

  let viewContent: React.ReactNode;

  if (pMatch && pMatch[1]) {
    // Distinctive Dinosaur Copy Route /p/[slug]
    const slug = pMatch[1];
    viewContent = <CopyDinosaurView slug={slug} onNavigate={navigateTo} />;
  } else if (cMatch && cMatch[1]) {
    // Saved Document Viewing Route /c/[slug]
    const slug = cMatch[1];
    viewContent = (
      <DocumentView
        slug={slug}
        onNavigate={navigateTo}
        onForkDocument={handleForkDocument}
      />
    );
  } else {
    // Editor Route /c/ or /
    viewContent = (
      <EditorView
        onNavigate={navigateTo}
        onDocumentCreated={handleDocumentCreated}
        initialContent={forkedContent}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans transition-colors antialiased selection:bg-neutral-200 dark:selection:bg-neutral-800">
      <Navbar
        onNavigate={navigateTo}
        currentPath={currentPath}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenTests={() => setIsTestModalOpen(true)}
        onOpenCacheDrawer={() => setIsCacheDrawerOpen(true)}
        cachedCount={cachedDocs.length}
      />

      <main className="flex-1 w-full">{viewContent}</main>

      <CacheDrawer
        isOpen={isCacheDrawerOpen}
        onClose={() => setIsCacheDrawerOpen(false)}
        cachedDocs={cachedDocs}
        onSelectDoc={navigateTo}
        onDeleteDoc={handleDeleteCachedDoc}
        onClearAll={handleClearAllCache}
      />

      <TestRunnerModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
      />
    </div>
  );
}

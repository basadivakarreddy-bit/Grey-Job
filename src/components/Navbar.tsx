import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Database,
  CheckCircle2,
  Wifi,
  WifiOff,
  Terminal,
} from 'lucide-react';
import { isAudioEnabled, setAudioEnabled } from '../utils/audio';

interface NavbarProps {
  onNavigate: (path: string) => void;
  currentPath: string;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenTests: () => void;
  onOpenCacheDrawer: () => void;
  cachedCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNavigate,
  currentPath,
  isDark,
  onToggleTheme,
  onOpenTests,
  onOpenCacheDrawer,
  cachedCount,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [soundOn, setSoundOn] = useState<boolean>(isAudioEnabled());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setAudioEnabled(next);
  };

  const isDinoRoute = currentPath.startsWith('/p/');

  // On dinosaur page /p/, render nothing so the UI exactly matches the Chrome offline error screen
  if (isDinoRoute) {
    return null;
  }

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 sticky top-0 z-40 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onNavigate('/c/')}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-7 h-7 rounded bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 flex items-center justify-center font-mono font-bold text-sm shadow-xs">
              G
            </div>
            <div>
              <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm tracking-tight leading-none group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors">
                grey-job
              </div>
              <div className="text-[11px] text-neutral-400 dark:text-neutral-500 font-mono leading-none mt-0.5">
                text & offline clipboard
              </div>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onNavigate('/c/')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                currentPath === '/c/' || currentPath === '/'
                  ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => onNavigate('/c/welcome')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                currentPath === '/c/welcome'
                  ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              Demo: /c/welcome
            </button>
            <button
              onClick={() => onNavigate('/p/welcome')}
              className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 rounded-md transition-colors"
            >
              Demo Dino: /p/welcome
            </button>
          </nav>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Online/Offline status */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60"
            title={isOnline ? 'Connected to network' : 'Offline - Using local cache'}
          >
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">Online</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-amber-600 dark:text-amber-400 font-medium">Offline</span>
              </>
            )}
          </div>

          {/* Cached documents button */}
          <button
            onClick={onOpenCacheDrawer}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
            title="View offline cached documents"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cache</span>
            {cachedCount > 0 && (
              <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                ({cachedCount})
              </span>
            )}
          </button>

          {/* Test suite trigger */}
          <button
            onClick={onOpenTests}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
            title="Run 15 Automated Tests"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Run Tests</span>
          </button>

          {/* New Document */}
          <button
            onClick={() => onNavigate('/c/')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white rounded-md transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>

          {/* Sound toggle */}
          <button
            onClick={handleToggleSound}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
            title={soundOn ? 'Mute 8-bit sounds' : 'Enable 8-bit sounds'}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Dark/Light toggle */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};

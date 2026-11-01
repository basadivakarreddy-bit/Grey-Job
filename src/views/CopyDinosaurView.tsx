import React, { useState, useEffect, useCallback } from 'react';
import { copyToClipboard } from '../utils/clipboard';
import { getDocumentFromCache, saveDocumentToCache } from '../utils/idb';
import { playDinoJumpSound } from '../utils/audio';

interface CopyDinosaurViewProps {
  slug: string;
  onNavigate: (path: string) => void;
}

export const CopyDinosaurView: React.FC<CopyDinosaurViewProps> = ({ slug }) => {
  const [content, setContent] = useState<string | null>(null);
  const [isJumping, setIsJumping] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const normalizedSlug = slug.toLowerCase().trim();

  // Load document content in memory for instant clipboard copying (without displaying it)
  useEffect(() => {
    let isMounted = true;

    async function fetchDoc() {
      // Check IndexedDB cache first
      const cached = await getDocumentFromCache(normalizedSlug);
      if (cached && isMounted) {
        setContent(cached.content);
      }

      // If online, refresh from server
      if (navigator.onLine) {
        try {
          const res = await fetch(`/api/documents/${normalizedSlug}`);
          const data = await res.json();
          if (res.ok && data.success && isMounted) {
            setContent(data.document.content);
            await saveDocumentToCache({
              slug: data.document.slug,
              id: data.document.id,
              content: data.document.content,
              contentLength: data.document.contentLength,
              createdAt: data.document.createdAt,
            });
          }
        } catch {
          // Keep cached content if available
        }
      }
    }

    fetchDoc();
    return () => {
      isMounted = false;
    };
  }, [normalizedSlug]);

  const handleCopy = useCallback(async () => {
    // Play retro 8-bit jump sound
    playDinoJumpSound();

    // Trigger visual jump animation
    setIsJumping(true);
    setTimeout(() => setIsJumping(false), 240);

    if (content) {
      const res = await copyToClipboard(content);
      if (res.success) {
        setCopied(true);
        if (navigator.onLine) {
          fetch(`/api/documents/${normalizedSlug}/copy`, { method: 'POST' }).catch(() => {});
        }
        setTimeout(() => setCopied(false), 1600);
      }
    }
  }, [content, normalizedSlug]);

  // Spacebar triggers the jump & copy, matching "Press space to play"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleCopy();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopy]);

  return (
    <div className="fixed inset-0 z-50 bg-[#202124] text-[#9aa0a6] font-sans overflow-auto select-none">
      <div className="max-w-[580px] mx-auto px-8 pt-[16vh] sm:pt-[18vh] text-left">
        {/* Official Chrome Offline T-Rex with Ground Line */}
        <div className="mb-6">
          <div
            role="button"
            tabIndex={0}
            onClick={handleCopy}
            className="relative inline-block cursor-pointer outline-none"
            aria-label="Click dinosaur to copy"
          >
            <svg
              width="64"
              height="43"
              viewBox="0 0 64 43"
              className="overflow-visible"
              style={{ shapeRendering: 'crispEdges' }}
            >
              {/* Static ground line and tufts (stays on ground during jump) */}
              <path
                shapeRendering="crispEdges"
                fillRule="evenodd"
                fill="#acacac"
                d="M0,35h16v1h-16zM36,35h28v1h-28zM55,38h3v1h-3zM6,39h4v1h-4zM41,41h1v1h-1zM0,42h4v1h-4zM14,42h2v1h-2zM48,42h4v1h-4z"
              />

              {/* Dinosaur T-Rex body (jumps up on click/space) */}
              <g
                style={{
                  transform: isJumping ? 'translateY(-24px)' : 'translateY(0)',
                  transition: 'transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                }}
              >
                <path
                  shapeRendering="crispEdges"
                  fillRule="evenodd"
                  fill="#acacac"
                  d="M32,0h16v2h2v9h-10v2h6v2h-8v4h4v4h-2v-2h-2v7h-2v3h-2v2h-2v8h2v2h-4v-6h-2v-2h-2v2h-2v2h-2v2h2v2h-4v-8h-2v-2h-2v-2h-2v-2h-2v-2h-2v-12h2v4h2v2h2v2h4v-2h2v-2h3v-2h3v-2h2v-13h2zM34,3h2v2h-2z"
                />
              </g>
            </svg>
          </div>
        </div>

        {/* Heading: Displays "Done" when copied, otherwise "Press space to play" */}
        <h1 className="text-[22px] font-medium text-[#e8eaed] mb-4 leading-normal tracking-normal transition-colors">
          {copied ? 'Done' : 'Press space to play'}
        </h1>

        {/* Instructions */}
        <p className="text-[14px] text-[#9aa0a6] mb-2 leading-relaxed">
          Try:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-[13px] text-[#9aa0a6] leading-relaxed">
          <li>Checking the network cables, modem and router</li>
          <li>Reconnecting to Wi-Fi</li>
        </ul>

        {/* Error Code */}
        <div className="text-[11px] text-[#80868b] mt-8 tracking-wider font-normal">
          ERR_INTERNET_DISCONNECTED
        </div>
      </div>
    </div>
  );
};

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
        {/* Authentic Pixel Dinosaur with Ground Line */}
        <div className="mb-6">
          <div
            role="button"
            tabIndex={0}
            onClick={handleCopy}
            className="inline-block cursor-pointer outline-none"
            style={{
              transform: isJumping ? 'translateY(-30px)' : 'translateY(0)',
              transition: 'transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
            aria-label="Click dinosaur to copy"
          >
            <svg
              width="48"
              height="52"
              viewBox="0 0 44 47"
              className="overflow-visible"
              style={{ shapeRendering: 'crispEdges' }}
            >
              {/* Ground line with characteristic Chrome gaps */}
              <path
                d="M-12 46 h14 M6 46 h24 M34 46 h8 M46 46 h16"
                stroke="#5f6368"
                strokeWidth="1.5"
                strokeLinecap="square"
              />

              {/* Pixel Art Dinosaur */}
              <rect x="22" y="0" width="18" height="2" fill="#bdc1c6" />
              <rect x="21" y="2" width="21" height="2" fill="#bdc1c6" />
              <rect x="21" y="4" width="22" height="2" fill="#bdc1c6" />
              <rect x="21" y="6" width="22" height="2" fill="#bdc1c6" />
              <rect x="21" y="8" width="22" height="2" fill="#bdc1c6" />
              <rect x="21" y="10" width="12" height="2" fill="#bdc1c6" />
              <rect x="21" y="12" width="19" height="2" fill="#bdc1c6" />
              {/* Eye cutout */}
              <rect x="24" y="4" width="2" height="2" fill="#202124" />

              {/* Neck & Chest */}
              <rect x="21" y="14" width="11" height="2" fill="#bdc1c6" />
              <rect x="21" y="16" width="11" height="2" fill="#bdc1c6" />

              {/* Upper Body & Arms */}
              <rect x="19" y="18" width="14" height="2" fill="#bdc1c6" />
              <rect x="17" y="20" width="18" height="2" fill="#bdc1c6" />
              <rect x="34" y="22" width="4" height="2" fill="#bdc1c6" />
              <rect x="36" y="24" width="2" height="2" fill="#bdc1c6" />

              {/* Torso & Tail */}
              <rect x="15" y="22" width="18" height="2" fill="#bdc1c6" />
              <rect x="13" y="24" width="19" height="2" fill="#bdc1c6" />
              <rect x="9" y="26" width="21" height="2" fill="#bdc1c6" />
              <rect x="5" y="28" width="23" height="2" fill="#bdc1c6" />
              <rect x="1" y="30" width="25" height="2" fill="#bdc1c6" />
              <rect x="0" y="32" width="24" height="2" fill="#bdc1c6" />
              <rect x="0" y="34" width="22" height="2" fill="#bdc1c6" />
              <rect x="1" y="36" width="19" height="2" fill="#bdc1c6" />
              <rect x="3" y="38" width="15" height="2" fill="#bdc1c6" />
              <rect x="5" y="40" width="11" height="2" fill="#bdc1c6" />

              {/* Legs */}
              <rect x="9" y="42" width="3" height="2" fill="#bdc1c6" />
              <rect x="9" y="44" width="5" height="2" fill="#bdc1c6" />
              <rect x="15" y="42" width="3" height="2" fill="#bdc1c6" />
              <rect x="15" y="44" width="5" height="2" fill="#bdc1c6" />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-[22px] font-medium text-[#e8eaed] mb-4 leading-normal tracking-normal transition-colors">
          {copied ? 'Copied to clipboard!' : 'Press space to play'}
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

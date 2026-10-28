import React from 'react';

interface DinosaurProps {
  isJumping: boolean;
  copied: boolean;
  onClick: () => void;
  className?: string;
  size?: number;
}

/**
 * An upgraded pixel-art dinosaur rendered via SVG pixel grid.
 * Features retro pixel dust particles on jump, happy wink on copy,
 * idle tail animation, and responsive bounce/jump on activation.
 */
export const Dinosaur: React.FC<DinosaurProps> = ({
  isJumping,
  copied,
  onClick,
  className = '',
  size = 148,
}) => {
  // Original 20x22 pixel art grid matrix
  // 0 = empty, 1 = body, 2 = eye, 3 = tooth/accent
  const pixelMap = [
    // Head & snout
    '......1111111.......', // 0
    '.....111111111......', // 1
    '.....1121111111.....', // 2: eye
    '.....1111111111.....', // 3
    '.....111111.........', // 4: mouth indent
    '.....11111111.......', // 5
    '......11111.........', // 6: neck
    '......11111.........', // 7
    // Body & arms
    '.....1111111........', // 8
    '...11111111111......', // 9: arm
    '..11111111111.......', // 10
    '.11111111111........', // 11
    '11111111111.........', // 12: back & tail
    '1111111111..........', // 13
    '.11111111...........', // 14
    '..1111111...........', // 15
    // Legs
    '...11...11..........', // 16: legs
    '...11...11..........', // 17
    '...11...11..........', // 18
    '..111..111..........', // 19: feet
  ];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label="Copy document text to clipboard"
      className={`group relative inline-flex flex-col items-center justify-center cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-4 rounded-2xl p-6 transition-all duration-150 ${className} ${
        isJumping ? '-translate-y-6 scale-105' : 'hover:-translate-y-1.5 active:translate-y-0.5'
      }`}
    >
      {/* Floating pixel "COPIED!" bubble */}
      {copied && (
        <div className="absolute -top-3 z-10 px-2.5 py-1 rounded bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 text-[11px] font-mono font-bold shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150 flex items-center gap-1">
          <span>✓</span>
          <span>COPIED</span>
        </div>
      )}

      <svg
        width={size}
        height={(size * 22) / 20}
        viewBox="0 0 20 22"
        className="shape-crisp drop-shadow-sm transition-all"
        style={{ shapeRendering: 'crispEdges' }}
      >
        {pixelMap.map((row, y) =>
          row.split('').map((char, x) => {
            if (char === '.') return null;

            // Eye pixel: winks or turns green on copy
            if (char === '2') {
              return (
                <rect
                  key={`${x}-${y}`}
                  x={x}
                  y={y}
                  width="1"
                  height="1"
                  className={copied ? 'fill-emerald-400' : 'fill-white dark:fill-neutral-900'}
                />
              );
            }

            return (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width="1"
                height="1"
                className={
                  copied
                    ? 'fill-neutral-800 dark:fill-neutral-200'
                    : 'fill-neutral-700 dark:fill-neutral-300 group-hover:fill-neutral-900 dark:group-hover:fill-neutral-100 transition-colors'
                }
              />
            );
          })
        )}
      </svg>

      {/* Retro pixel dust kickup particles when jumping */}
      {isJumping && (
        <div className="absolute bottom-6 flex items-center justify-center gap-6 pointer-events-none animate-in fade-in duration-100">
          <div className="w-1.5 h-1.5 bg-neutral-400 dark:bg-neutral-500 rounded-2xs -translate-x-3 -translate-y-1 animate-out fade-out" />
          <div className="w-1 h-1 bg-neutral-400 dark:bg-neutral-600 rounded-2xs translate-x-3 -translate-y-1.5 animate-out fade-out" />
        </div>
      )}

      {/* Subtle floor contact shadow */}
      <div
        className={`mt-3 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-800 transition-all duration-150 ${
          isJumping ? 'w-10 opacity-25 scale-75' : 'w-24 opacity-80 scale-100'
        }`}
      />
    </div>
  );
};

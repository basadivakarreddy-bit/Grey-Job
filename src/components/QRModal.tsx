import React, { useState } from 'react';
import { X, Copy, Check, QrCode, ExternalLink } from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
}

export const QRModal: React.FC<QRModalProps> = ({ isOpen, onClose, title, url }) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(
    url
  )}`;

  const handleCopy = async () => {
    const res = await copyToClipboard(url);
    if (res.success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col items-center text-center space-y-4">
        {/* Header */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
            <QrCode className="w-4 h-4" />
            <span>Scan on Mobile</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="p-3 bg-white rounded-lg border border-neutral-200 shadow-2xs">
          <img
            src={qrImageUrl}
            alt={`QR code for ${url}`}
            className="w-48 h-48 object-contain"
            loading="lazy"
          />
        </div>

        {/* Details */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">{title}</p>
          <p className="text-[11px] font-mono text-neutral-500 break-all">{url}</p>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex items-center gap-2 pt-2">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </>
            )}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium rounded-md bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white transition-colors"
          >
            <span>Open</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};

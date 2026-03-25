import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GeorgeOrb } from './GeorgeOrb';
import type { OrbStatus } from './GeorgeOrb';

// @ts-ignore — george.js is a plain ES module
import { startGeorge, stopGeorge, onStatusChange } from '../george.js';

const GEORGE_WS_URL = import.meta.env.VITE_GEORGE_WS_URL || 'wss://george-agent.vercel.app/ws/george';

export function VoiceHamm() {
  const [isOpen, setIsOpen] = useState(false);
  const [orbStatus, setOrbStatus] = useState<OrbStatus>('idle');
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Wire up George status changes
  useEffect(() => {
    onStatusChange(({ status, text }: { status: string; text?: string }) => {
      switch (status) {
        case 'connecting':
          setOrbStatus('listening');
          setStatusText('Connecting...');
          break;
        case 'listening':
          setOrbStatus('listening');
          setStatusText('Listening...');
          setError(null);
          break;
        case 'processing':
          setOrbStatus('listening');
          setStatusText('Thinking...');
          break;
        case 'speaking':
          setOrbStatus('speaking');
          setStatusText('Speaking...');
          break;
        case 'transcript':
          setStatusText(`You: ${text || ''}`);
          break;
        case 'error':
          setOrbStatus('idle');
          setError(text || 'Something went wrong');
          setIsOpen(false);
          break;
        case 'disconnected':
        case 'stopped':
          setOrbStatus('idle');
          setStatusText('');
          setIsOpen(false);
          break;
      }
    });
  }, []);

  const handleStart = useCallback(async () => {
    try {
      setError(null);
      setIsOpen(true);
      await startGeorge(GEORGE_WS_URL);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to George';
      setError(msg);
      setIsOpen(false);
      setOrbStatus('idle');
    }
  }, []);

  const handleStop = useCallback(() => {
    stopGeorge();
    setIsOpen(false);
    setOrbStatus('idle');
    setStatusText('');
  }, []);

  const button = (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      {/* Error toast */}
      {error && (
        <div className="bg-red-900/90 text-red-200 text-sm px-3 py-2 rounded-lg max-w-xs text-center">
          {error}
        </div>
      )}

      {/* Status panel when active */}
      {isOpen && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3 shadow-xl">
          <div className={`w-2.5 h-2.5 rounded-full ${
            orbStatus === 'speaking'
              ? 'bg-emerald-400 animate-pulse'
              : 'bg-blue-400 animate-pulse'
          }`} />
          <span className="text-sm text-gray-300 max-w-xs truncate">
            {statusText || 'Connecting...'}
          </span>
          <button
            onClick={handleStop}
            className="ml-2 text-gray-500 hover:text-red-400 transition-colors text-xs"
          >
            End
          </button>
        </div>
      )}

      {/* George Orb */}
      <GeorgeOrb
        status={orbStatus}
        onClick={isOpen ? handleStop : handleStart}
        size={80}
      />
    </div>
  );

  return createPortal(button, document.body);
}

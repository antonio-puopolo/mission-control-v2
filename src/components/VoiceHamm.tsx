import { useConversation } from '@11labs/react';
import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { GeorgeOrb } from './GeorgeOrb';
import type { OrbStatus } from './GeorgeOrb';

const AGENT_ID = 'agent_9501kk0dwrjheyy8qwbkxwznm8jr';

export function VoiceHamm() {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conversation = useConversation({
    onConnect: () => {
      setError(null);
    },
    onDisconnect: () => {
      setIsOpen(false);
    },
    onError: (err: unknown) => {
      setError(typeof err === 'string' ? err : 'Connection failed');
    },
  });

  const startConversation = useCallback(async () => {
    try {
      setError(null);
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({ agentId: AGENT_ID, connectionType: 'webrtc' });
      setIsOpen(true);
    } catch (err) {
      setError('Microphone access required');
      console.error(err);
    }
  }, [conversation]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
    setIsOpen(false);
  }, [conversation]);

  const isConnected = conversation.status === 'connected';
  const isSpeaking = conversation.isSpeaking;

  // Map conversation state to orb visual state
  const orbStatus: OrbStatus = !isConnected
    ? 'idle'
    : isSpeaking
    ? 'speaking'
    : 'listening';

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
          <div className="bg-red-900/90 text-red-200 text-sm px-3 py-2 rounded-lg max-w-xs">
            {error}
          </div>
        )}

        {/* Status panel when active */}
        {isOpen && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3 shadow-xl">
            <div className={`w-2.5 h-2.5 rounded-full ${
              isSpeaking
                ? 'bg-emerald-400 animate-pulse'
                : isConnected
                ? 'bg-blue-400 animate-pulse'
                : 'bg-gray-500'
            }`} />
            <span className="text-sm text-gray-300">
              {isSpeaking ? 'Hamm is speaking...' : isConnected ? 'Listening...' : 'Connecting...'}
            </span>
            <button
              onClick={stopConversation}
              className="ml-2 text-gray-500 hover:text-red-400 transition-colors text-xs"
            >
              End
            </button>
          </div>
        )}

        {/* George Orb — replaces the pig button; orb state speaks for itself */}
        <GeorgeOrb
          status={orbStatus}
          onClick={isOpen ? stopConversation : startConversation}
          size={80}
        />
      </div>
  );

  return createPortal(button, document.body);
}

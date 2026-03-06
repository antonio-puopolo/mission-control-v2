import { useConversation } from '@11labs/react';
import { useState, useCallback } from 'react';

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

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {/* Error toast */}
        {error && (
          <div className="bg-red-900/90 text-red-200 text-sm px-3 py-2 rounded-lg max-w-xs">
            {error}
          </div>
        )}

        {/* Status panel when active */}
        {isOpen && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3 shadow-xl">
            {/* Audio visualiser — simple pulsing dot */}
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

        {/* Main mic button */}
        <button
          onClick={isOpen ? stopConversation : startConversation}
          title={isOpen ? 'End conversation' : 'Talk to Hamm'}
          className={`
            w-14 h-14 rounded-full shadow-xl flex items-center justify-center
            transition-all duration-200 active:scale-95
            ${isOpen
              ? 'bg-red-600 hover:bg-red-700 ring-2 ring-red-400/50'
              : 'bg-emerald-600 hover:bg-emerald-700'
            }
            ${isConnected && !isSpeaking ? 'ring-2 ring-blue-400/50 animate-pulse' : ''}
          `}
        >
          {isOpen ? (
            // Stop icon
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
          ) : (
            // Mic icon
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z"/>
              <path d="M19 10a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.92V19H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-2.08A7 7 0 0 0 19 10z"/>
            </svg>
          )}
        </button>

        {/* Label */}
        {!isOpen && (
          <span className="text-xs text-gray-500 font-medium">Talk to Hamm</span>
        )}
      </div>
    </>
  );
}

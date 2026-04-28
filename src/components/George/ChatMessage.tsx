import React from 'react'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool_result'
  content: string
  timestamp: Date
  isLoading?: boolean
  toolName?: string
}

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isLoading = message.isLoading
  const isToolResult = message.role === 'tool_result'

  if (isToolResult) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        margin: '0.25rem 0',
      }}>
        <div style={{
          fontSize: '0.7rem',
          color: '#6B7280',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '6px',
          padding: '0.2rem 0.6rem',
          fontStyle: 'italic',
        }}>
          ⚙️ {message.toolName ? `Ran ${message.toolName}` : 'Tool executed'}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '0.5rem',
    }}>
      {!isUser && (
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #EAEAE0, #EAEAE0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.85rem',
          flexShrink: 0,
          marginRight: '0.5rem',
          marginTop: '2px',
        }}>
          🤖
        </div>
      )}

      <div style={{
        maxWidth: '80%',
        padding: '0.6rem 0.85rem',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isUser
          ? 'linear-gradient(135deg, #EAEAE0, #EAEAE0)'
          : 'rgba(255,255,255,0.08)',
        color: isUser ? '#000' : '#E5E7EB',
        fontSize: '0.82rem',
        lineHeight: '1.5',
        fontWeight: isUser ? 500 : 400,
        boxShadow: isUser
          ? '0 2px 8px rgba(245,158,11,0.2)'
          : '0 1px 4px rgba(0,0,0,0.2)',
        border: isUser ? 'none' : '1px solid rgba(255,255,255,0.08)',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
      }}>
        {isLoading ? (
          <TypingIndicator />
        ) : (
          <MarkdownText text={message.content} />
        )}
      </div>

      {isUser && (
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          flexShrink: 0,
          marginLeft: '0.5rem',
          marginTop: '2px',
          color: '#fff',
          fontWeight: 700,
        }}>
          A
        </div>
      )}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '2px 0' }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#EAEAE0',
            animation: `george-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

// Simple markdown renderer — bold, italic, inline code, line breaks
function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, li) => (
        <React.Fragment key={li}>
          {li > 0 && <br />}
          <InlineMd text={line} />
        </React.Fragment>
      ))}
    </>
  )
}

function InlineMd({ text }: { text: string }) {
  // Parse **bold**, *italic*, `code`
  const parts: React.ReactNode[] = []
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let last = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index))
    }
    if (match[2]) parts.push(<strong key={match.index}>{match[2]}</strong>)
    else if (match[3]) parts.push(<em key={match.index}>{match[3]}</em>)
    else if (match[4]) parts.push(
      <code key={match.index} style={{
        background: 'rgba(255,255,255,0.12)',
        borderRadius: '3px',
        padding: '0 3px',
        fontSize: '0.78rem',
        fontFamily: 'monospace',
      }}>{match[4]}</code>
    )
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}

import React, { useState, useRef, useEffect } from 'react'

const PANEL_WIDTH = 340

const styles = {
  panel: {
    width: PANEL_WIDTH,
    minWidth: PANEL_WIDTH,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    height: '100%',
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--dark2)',
    flexShrink: 0,
  },
  headerLabel: {
    fontSize: 9,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--gold)',
    fontFamily: 'DM Sans',
    fontWeight: 600,
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    fontSize: 11,
    fontFamily: 'DM Sans',
    padding: '2px 6px',
    borderRadius: 4,
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '14px 14px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  suggestions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '8px 0 0',
  },
  suggestionBtn: {
    background: 'none',
    border: '1px solid var(--gold-border)',
    borderRadius: 8,
    padding: '7px 10px',
    textAlign: 'left',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    fontSize: 12,
    fontFamily: 'DM Sans',
    lineHeight: 1.4,
    transition: 'all 0.15s',
  },
  bubble: (role) => ({
    padding: '9px 12px',
    borderRadius: role === 'user' ? '12px 12px 4px 12px' : '4px 12px 12px 12px',
    background: role === 'user' ? 'var(--gold)' : 'var(--dark3)',
    color: role === 'user' ? '#fff' : 'var(--text)',
    fontSize: 13,
    fontFamily: 'DM Sans',
    lineHeight: 1.5,
    alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
    maxWidth: '85%',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  }),
  footer: {
    padding: '12px 14px',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    gap: 8,
    flexShrink: 0,
    background: 'var(--dark2)',
  },
  input: {
    flex: 1,
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '8px 10px',
    color: 'var(--text)',
    fontFamily: 'DM Sans',
    fontSize: 13,
    resize: 'none',
    outline: 'none',
    lineHeight: 1.4,
    maxHeight: 120,
    overflowY: 'auto',
  },
  sendBtn: {
    background: 'var(--gold)',
    border: 'none',
    borderRadius: 8,
    width: 36,
    height: 36,
    cursor: 'pointer',
    color: '#fff',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    alignSelf: 'flex-end',
  },
}

export default function AiPanel({ systemPrompt, context, suggestions = [], label = 'AI Assistant', placeholder = 'Ask anything…' }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text) {
    const userText = text || input.trim()
    if (!userText || loading) return
    setInput('')

    const userMsg = { role: 'user', content: userText }
    const history = [...messages, userMsg]
    setMessages(history)
    setLoading(true)

    // Build messages for API — prepend context as a system note if available
    const apiMessages = context
      ? [{ role: 'user', content: `[Context for this session]\n${context}` }, { role: 'assistant', content: 'Got it — I have the current context loaded.' }, ...history]
      : history

    try {
      const res = await fetch('/.netlify/functions/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, systemPrompt }),
      })
      const data = await res.json()
      if (data.text) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.text }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error || 'Unknown error'}` }])
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Network error: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const showSuggestions = messages.length === 0 && suggestions.length > 0

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerLabel}>{label}</span>
        {messages.length > 0 && (
          <button style={styles.clearBtn} onClick={() => setMessages([])}>Clear</button>
        )}
      </div>

      <div style={styles.messages}>
        {showSuggestions && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Sans', marginBottom: 8 }}>
              Try asking…
            </div>
            <div style={styles.suggestions}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  style={styles.suggestionBtn}
                  onClick={() => send(s)}
                  onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--text)' }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--gold-border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={styles.bubble(m.role)}>{m.content}</div>
        ))}

        {loading && (
          <div style={{ ...styles.bubble('assistant'), color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Thinking…
          </div>
        )}

        <div ref={bottomRef} style={{ height: 14 }} />
      </div>

      <div style={styles.footer}>
        <textarea
          ref={textareaRef}
          style={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
        />
        <button
          style={{ ...styles.sendBtn, opacity: (!input.trim() || loading) ? 0.4 : 1 }}
          onClick={() => send()}
          disabled={!input.trim() || loading}
        >
          ↑
        </button>
      </div>
    </div>
  )
}

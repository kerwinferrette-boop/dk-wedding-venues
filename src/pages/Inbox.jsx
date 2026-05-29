// Inbox page — Gmail-integrated vendor inbox tracker + AI assistant.
// Uses Google Identity Services for OAuth. Requires VITE_GOOGLE_CLIENT_ID env var.

import React, { useEffect, useState, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import AiPanel from '../components/AiPanel'

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send'
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

const SYSTEM_PROMPT = `You are a wedding vendor inbox manager for Dani & Kerwin's wedding on March 27, 2027.

Your role:
- Help track and manage vendor email threads
- Identify what's outstanding, what needs follow-up, and what to prioritize
- Draft follow-up emails and replies to vendor inquiries
- Summarize email threads clearly and concisely
- Flag important items: contracts to review, deposits due, deadlines mentioned

When drafting emails:
- Be warm but professional
- Be specific about the wedding date (March 27, 2027) and venue (La Valencia, La Jolla)
- Keep emails concise — 2-3 paragraphs max
- Sign as "Dani & Kerwin"

Context with the selected vendor and thread will be injected at the start.`

const SUGGESTIONS = [
  'Draft a follow-up email for this vendor',
  'Summarize this email thread',
  'What\'s still outstanding from them?',
  'Help me write a polite check-in',
]

function fmtDate(ts) {
  if (!ts) return ''
  const d = new Date(Number(ts))
  const now = new Date()
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'short' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function decodeBase64(str) {
  try {
    return atob(str.replace(/-/g, '+').replace(/_/g, '/'))
  } catch { return '' }
}

function getHeader(headers, name) {
  return headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || ''
}

function extractBody(payload) {
  if (!payload) return ''
  if (payload.body?.data) return decodeBase64(payload.body.data)
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) return decodeBase64(part.body.data)
    }
    for (const part of payload.parts) {
      const nested = extractBody(part)
      if (nested) return nested
    }
  }
  return ''
}

export default function Inbox() {
  const [token, setToken] = useState(() => sessionStorage.getItem('gmail_token') || null)
  const [vendors, setVendors] = useState([])
  const [threads, setThreads] = useState([]) // [{ vendorId, vendorName, threadId, subject, snippet, date, unread, messages }]
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const tokenClientRef = useRef(null)

  // Load vendor emails from Supabase
  useEffect(() => {
    supabase.from('vendor_pipeline').select('id,name,vendor_type,contact_email,status').then(({ data }) => {
      setVendors((data || []).filter(v => v.contact_email))
    })
  }, [])

  // Load threads when we have a token and vendors
  useEffect(() => {
    if (token && vendors.length > 0) loadThreads()
  }, [token, vendors])

  function initGIS() {
    if (!window.google?.accounts?.oauth2) {
      setAuthError('Google Identity Services failed to load. Check your internet connection.')
      return
    }
    if (!CLIENT_ID) {
      setAuthError('VITE_GOOGLE_CLIENT_ID is not set. Add it to your .env file and Netlify env vars.')
      return
    }
    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: GMAIL_SCOPE,
      callback: (resp) => {
        if (resp.error) { setAuthError(resp.error); return }
        sessionStorage.setItem('gmail_token', resp.access_token)
        setToken(resp.access_token)
        setAuthError('')
      },
    })
    tokenClientRef.current.requestAccessToken()
  }

  function disconnect() {
    sessionStorage.removeItem('gmail_token')
    setToken(null)
    setThreads([])
    setSelected(null)
  }

  async function gmailFetch(path, params = {}) {
    const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`)
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status === 401) {
      disconnect()
      throw new Error('Token expired — please reconnect Gmail')
    }
    return res.json()
  }

  async function loadThreads() {
    setLoading(true)
    const results = []

    // For each vendor with an email, search for threads with that email
    await Promise.allSettled(vendors.map(async (vendor) => {
      try {
        const query = `from:${vendor.contact_email} OR to:${vendor.contact_email}`
        const listRes = await gmailFetch('threads', { q: query, maxResults: '5' })
        const threadList = listRes.threads || []

        await Promise.allSettled(threadList.map(async (t) => {
          try {
            const detail = await gmailFetch(`threads/${t.id}`, { format: 'metadata', metadataHeaders: 'Subject,Date,From,To' })
            const msgs = detail.messages || []
            const firstMsg = msgs[0]
            const lastMsg = msgs[msgs.length - 1]
            const subject = getHeader(firstMsg?.payload?.headers, 'Subject') || '(no subject)'
            const dateTs = lastMsg?.internalDate
            const unread = msgs.filter(m => m.labelIds?.includes('UNREAD')).length

            results.push({
              vendorId: vendor.id,
              vendorName: vendor.name || vendor.vendor_type,
              vendorEmail: vendor.contact_email,
              threadId: t.id,
              subject,
              snippet: lastMsg?.snippet || '',
              date: dateTs,
              unread,
              messageCount: msgs.length,
            })
          } catch { /* skip failed threads */ }
        }))
      } catch { /* skip failed vendor */ }
    }))

    // Sort by date desc
    results.sort((a, b) => (Number(b.date) || 0) - (Number(a.date) || 0))
    setThreads(results)
    setLoading(false)
  }

  async function loadFullThread(thread) {
    if (thread.messages) { setSelected(thread); return }
    try {
      const detail = await gmailFetch(`threads/${thread.threadId}`, { format: 'full' })
      const messages = (detail.messages || []).map(m => ({
        id: m.id,
        from: getHeader(m.payload?.headers, 'From'),
        date: m.internalDate,
        body: extractBody(m.payload),
        snippet: m.snippet,
      }))
      const enriched = { ...thread, messages }
      setThreads(prev => prev.map(t => t.threadId === thread.threadId ? enriched : t))
      setSelected(enriched)
    } catch (err) {
      console.error(err)
    }
  }

  const aiContext = useMemo(() => {
    if (!selected) return null
    const vendor = vendors.find(v => v.id === selected.vendorId)
    const lines = [
      `Vendor: ${selected.vendorName}`,
      vendor?.contact_email && `Email: ${vendor.contact_email}`,
      vendor?.status && `Pipeline status: ${vendor.status}`,
      `Thread subject: ${selected.subject}`,
      `Messages in thread: ${selected.messageCount || '?'}`,
    ]
    if (selected.messages?.length) {
      lines.push('\nThread content:')
      selected.messages.slice(-4).forEach(m => {
        lines.push(`\nFrom: ${m.from}\n${m.body?.slice(0, 500) || m.snippet || ''}`)
      })
    }
    return lines.filter(Boolean).join('\n')
  }, [selected, vendors])

  // --- Auth states ---
  if (!token) {
    return (
      <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 40 }}>
          <div style={{ fontSize: 40 }}>📬</div>
          <h2 style={{ margin: 0, fontFamily: 'Playfair Display, Georgia, serif', color: 'var(--text)' }}>
            Connect Gmail
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontFamily: 'DM Sans', fontSize: 14, textAlign: 'center', maxWidth: 400 }}>
            Connect your Gmail account to see vendor email threads. Threads are filtered to only show emails from/to your vendor contacts.
          </p>
          {authError && (
            <div style={{
              padding: '10px 16px', background: 'rgba(224,112,112,0.12)',
              border: '1px solid var(--red)', borderRadius: 8,
              color: 'var(--red)', fontFamily: 'DM Sans', fontSize: 13, maxWidth: 400,
            }}>
              {authError}
            </div>
          )}
          {!CLIENT_ID && (
            <div style={{
              padding: '10px 16px', background: 'rgba(201,168,76,0.12)',
              border: '1px solid var(--gold)', borderRadius: 8,
              color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 12, maxWidth: 400,
            }}>
              <strong>Setup required:</strong> Add <code>VITE_GOOGLE_CLIENT_ID=your-client-id</code> to your <code>.env</code> file and Netlify environment variables, then enable the Gmail API in Google Cloud Console.
            </div>
          )}
          <button
            onClick={initGIS}
            style={{
              padding: '12px 28px', background: 'var(--gold)', color: '#fff',
              border: 'none', borderRadius: 10, fontFamily: 'DM Sans', fontSize: 15,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            Connect Gmail
          </button>
        </div>
        <div style={{ padding: '28px 28px 28px 0', display: 'flex' }}>
          <AiPanel
            label="Inbox Assistant"
            systemPrompt={SYSTEM_PROMPT}
            context={null}
            suggestions={SUGGESTIONS}
            placeholder="Ask about vendor follow-ups…"
          />
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      {/* Thread list + detail */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Thread list */}
        <div style={{ width: 320, flexShrink: 0, borderRight: '1px solid var(--border)', overflowY: 'auto', background: 'var(--card)' }}>
          <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: '1rem', color: 'var(--text)', letterSpacing: '0.04em' }}>Inbox</div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {vendors.length} vendor contacts
              </div>
            </div>
            <button
              onClick={disconnect}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontFamily: 'DM Sans', fontSize: 11, cursor: 'pointer' }}
            >
              Disconnect
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 20, color: 'var(--text-muted)', fontFamily: 'DM Sans', fontSize: 13 }}>Loading threads…</div>
          ) : threads.length === 0 ? (
            <div style={{ padding: 20, color: 'var(--text-muted)', fontFamily: 'DM Sans', fontSize: 13 }}>
              No vendor threads found. Make sure your vendor contacts have emails in the Vendors page.
            </div>
          ) : (
            threads.map(t => (
              <div
                key={t.threadId}
                onClick={() => loadFullThread(t)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: selected?.threadId === t.threadId ? 'var(--dark2)' : t.unread > 0 ? 'rgba(201,168,76,0.06)' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseOver={e => { if (selected?.threadId !== t.threadId) e.currentTarget.style.background = 'var(--dark2)' }}
                onMouseOut={e => { if (selected?.threadId !== t.threadId) e.currentTarget.style.background = t.unread > 0 ? 'rgba(201,168,76,0.06)' : 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontFamily: 'DM Sans', fontSize: 13, fontWeight: t.unread > 0 ? 700 : 500, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.vendorName}
                  </span>
                  <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>
                    {fmtDate(t.date)}
                  </span>
                </div>
                <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.subject}
                </div>
                <div style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                  {t.snippet}
                </div>
                {t.unread > 0 && (
                  <div style={{ marginTop: 4 }}>
                    <span style={{
                      fontSize: 10, padding: '1px 6px', borderRadius: 999,
                      background: 'var(--gold)', color: '#fff',
                      fontFamily: 'DM Sans', fontWeight: 700,
                    }}>
                      {t.unread} unread
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Thread detail */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {!selected ? (
            <div style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans', fontSize: 14, marginTop: 60, textAlign: 'center' }}>
              Select a thread to read it
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontFamily: 'Playfair Display, Georgia, serif', fontSize: '1.2rem', color: 'var(--text)' }}>
                  {selected.subject}
                </h2>
                <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {selected.vendorName} · {selected.messageCount || 0} messages
                </div>
              </div>

              {selected.messages ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selected.messages.map(m => (
                    <div key={m.id} style={{
                      background: 'var(--card)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '14px 16px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{m.from}</span>
                        <span style={{ fontFamily: 'DM Sans', fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(m.date)}</span>
                      </div>
                      <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                        {m.body?.slice(0, 1200) || m.snippet}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans', fontSize: 13 }}>Loading messages…</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AI Panel */}
      <div style={{ padding: '28px 28px 28px 0', display: 'flex' }}>
        <AiPanel
          label="Inbox Assistant"
          systemPrompt={SYSTEM_PROMPT}
          context={aiContext}
          suggestions={SUGGESTIONS}
          placeholder="Draft a reply, summarize thread…"
        />
      </div>
    </div>
  )
}

/**
 * Theme & Design Studio
 * Fully interactive stationery editor — no iframe.
 * Live color / font / text / Pinterest inspiration, all in React.
 */

import React, { useState, useEffect, useRef } from 'react'

// ─── Design constants ────────────────────────────────────────────────────────

const DEFAULT_TEXT = {
  p1: 'Kerwin',
  p2: 'Danielle',
  lastName: 'Ferrette & Gaumer',
  date: 'March 27, 2027',
  shortDate: '3 · 27 · 27',
  day: 'Saturday',
  ceremony: 'Four o\'clock in the afternoon',
  cocktails: 'Five o\'clock · Ocean View Terrace',
  reception: 'Six o\'clock · La Sala Ballroom',
  venue: 'La Valencia Hotel',
  street: '1132 Prospect Street',
  city: 'La Jolla, California',
  rsvpDate: 'February 1, 2027',
  dress: 'Black Tie Optional',
  site: 'DKWedding2027.com',
  menuFirst: 'Garden Salad\nmixed greens, shaved parmesan\nchampagne vinaigrette',
  menuMain1: 'Filet Mignon\ntruffle butter, roasted fingerlings\nharicots verts',
  menuMain2: 'Pan Seared Halibut\ncitrus beurre blanc\nseasonal vegetables',
  menuDessert: 'Wedding Cake\nchampagne & vanilla',
}

const PALETTES = {
  a: {
    name: 'Noir Gatsby',
    sub: 'Old Hollywood · Black & Champagne',
    card: '#0C0C0C',
    accent: '#C9A96E',
    accentLight: '#E8D9B8',
    paper: '#F5F0E6',
    crimson: '#8B1A1A',
    border: 'rgba(201,169,110,0.4)',
    font: 'Cinzel, "Times New Roman", serif',
  },
  b: {
    name: 'La Valencia',
    sub: 'Mediterranean Coastal · Navy & Gold',
    card: '#FFFFFF',
    accent: '#D4914A',
    accentLight: '#E8C4AD',
    paper: '#F8F2E6',
    pacific: '#1C3554',
    bougainvillea: '#B83060',
    terracotta: '#C07850',
    border: 'rgba(28,53,84,0.18)',
    font: '"Cormorant Garamond", Georgia, serif',
  },
}

const HEADLINE_FONTS = [
  { value: 'Cinzel, "Times New Roman", serif', label: 'Cinzel — Classic' },
  { value: '"Playfair Display", Georgia, serif', label: 'Playfair Display' },
  { value: '"Cormorant Garamond", Georgia, serif', label: 'Cormorant Garamond' },
  { value: '"EB Garamond", Georgia, serif', label: 'EB Garamond' },
  { value: '"Great Vibes", cursive', label: 'Great Vibes — Script' },
]

const PIECES = [
  { id: 'std', label: 'Save the Date' },
  { id: 'invite', label: 'Invitation' },
  { id: 'rsvp', label: 'RSVP Card' },
  { id: 'menu', label: 'Dinner Menu' },
  { id: 'welcome', label: 'Welcome Sign' },
]

// ─── Stationery card pieces ──────────────────────────────────────────────────

function CardA_STD({ t, p, font }) {
  const card = { width: 420, minHeight: 588, background: p.card, position: 'relative', fontFamily: font, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 40px', boxSizing: 'border-box' }
  const abs = (inset, extra = {}) => ({ position: 'absolute', inset, pointerEvents: 'none', ...extra })
  const corner = (t2, r2, b2, l2) => ({ position: 'absolute', top: t2, right: r2, bottom: b2, left: l2, width: 20, height: 20 })
  return (
    <div style={card}>
      <div style={abs(12, { border: `0.5px solid ${p.border}` })} />
      {[['12px','auto','auto','12px',{ borderTop:`1px solid ${p.accent}`, borderLeft:`1px solid ${p.accent}` }],
        ['12px','12px','auto','auto',{ borderTop:`1px solid ${p.accent}`, borderRight:`1px solid ${p.accent}` }],
        ['auto','auto','12px','12px',{ borderBottom:`1px solid ${p.accent}`, borderLeft:`1px solid ${p.accent}` }],
        ['auto','12px','12px','auto',{ borderBottom:`1px solid ${p.accent}`, borderRight:`1px solid ${p.accent}` }]
      ].map(([t2,r2,b2,l2,s],i) => <div key={i} style={{ position:'absolute', top:t2, right:r2, bottom:b2, left:l2, width:20, height:20, pointerEvents:'none', ...s }} />)}

      <div style={{ fontSize: 8, letterSpacing: '0.35em', color: p.accent, textTransform: 'uppercase', marginBottom: 22 }}>Save the Date</div>
      <div style={{ fontSize: 36, letterSpacing: '0.12em', color: p.accent, textAlign: 'center', lineHeight: 1.1 }}>{t.p1}</div>
      <div style={{ fontSize: 22, color: p.accentLight, letterSpacing: '0.1em', margin: '6px 0' }}>&amp;</div>
      <div style={{ fontSize: 36, letterSpacing: '0.12em', color: p.accent, textAlign: 'center', lineHeight: 1.1 }}>{t.p2}</div>
      <div style={{ width: 80, height: 1, background: p.border, margin: '22px auto' }} />
      <div style={{ fontSize: 11, letterSpacing: '0.25em', color: p.accentLight, textTransform: 'uppercase', textAlign: 'center', marginBottom: 4 }}>{t.day} · {t.date}</div>
      <div style={{ width: 80, height: 1, background: p.border, margin: '18px auto' }} />
      <div style={{ fontSize: 10, letterSpacing: '0.2em', color: p.accent, textAlign: 'center', textTransform: 'uppercase', marginBottom: 3 }}>{t.venue}</div>
      <div style={{ fontSize: 9, letterSpacing: '0.12em', color: p.accentLight, textAlign: 'center', textTransform: 'uppercase', marginBottom: 26 }}>{t.city}</div>
      <div style={{ fontSize: 8, letterSpacing: '0.3em', color: p.accentLight, textTransform: 'uppercase' }}>Formal Invitation to Follow</div>
      <div style={{ fontSize: 8, letterSpacing: '0.18em', color: p.border, marginTop: 5 }}>{t.site}</div>
    </div>
  )
}

function CardB_STD({ t, p, font }) {
  const navy = p.pacific || '#1C3554'
  const rule = { display: 'flex', alignItems: 'center', gap: 12, margin: '18px auto', width: '80%' }
  const rl = { flex: 1, height: 1, background: p.border }
  const rd = { width: 5, height: 5, borderRadius: '50%', background: p.accent }
  return (
    <div style={{ width: 420, minHeight: 588, background: p.paper, border: `1px solid ${p.border}`, fontFamily: font, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 40px', boxSizing: 'border-box', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: p.accent }} />
      <div style={{ fontSize: 9, letterSpacing: '0.28em', color: p.accent, textTransform: 'uppercase', marginBottom: 22 }}>Save the Date</div>
      <div style={{ fontSize: 42, color: navy, textAlign: 'center', lineHeight: 1.05, fontStyle: 'italic' }}>{t.p1}</div>
      <div style={{ fontSize: 28, color: p.accent, margin: '4px 0' }}>&amp;</div>
      <div style={{ fontSize: 42, color: navy, textAlign: 'center', lineHeight: 1.05, fontStyle: 'italic' }}>{t.p2}</div>
      <div style={rule}><div style={rl} /><div style={rd} /><div style={rl} /></div>
      <div style={{ fontSize: 13, letterSpacing: '0.12em', color: navy, textAlign: 'center', marginBottom: 4 }}>{t.day}, {t.date}</div>
      <div style={rule}><div style={rl} /><div style={rd} /><div style={rl} /></div>
      <div style={{ fontSize: 11, color: navy, textAlign: 'center', fontStyle: 'italic', marginBottom: 2 }}>{t.venue}</div>
      <div style={{ fontSize: 9, letterSpacing: '0.1em', color: p.terracotta || p.accent, textAlign: 'center', textTransform: 'uppercase', marginBottom: 22 }}>{t.city}</div>
      <div style={{ fontSize: 9, letterSpacing: '0.3em', color: p.accent, textTransform: 'uppercase' }}>Formal Invitation to Follow</div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${p.bougainvillea||p.accent}, ${p.accent}, ${p.terracotta||p.accent})` }} />
    </div>
  )
}

function CardA_Invite({ t, p, font }) {
  const navy = p.card
  return (
    <div style={{ width: 420, background: p.card, fontFamily: font, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '52px 44px', boxSizing: 'border-box', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 10, border: `0.5px solid ${p.border}`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 15, border: `0.5px solid ${p.border}`, pointerEvents: 'none' }} />
      <div style={{ fontSize: 7, letterSpacing: '0.4em', color: p.accent, textTransform: 'uppercase', marginBottom: 20 }}>Wedding Invitation</div>
      <div style={{ fontSize: 8, letterSpacing: '0.18em', color: p.accentLight, textAlign: 'center', textTransform: 'uppercase', lineHeight: 1.9, marginBottom: 14 }}>Together with their families</div>
      <div style={{ fontSize: 28, letterSpacing: '0.1em', color: p.accent, textAlign: 'center', lineHeight: 1.15 }}>{t.p1}</div>
      <div style={{ fontSize: 18, color: p.accentLight, margin: '5px 0' }}>&amp;</div>
      <div style={{ fontSize: 28, letterSpacing: '0.1em', color: p.accent, textAlign: 'center', lineHeight: 1.15 }}>{t.p2}</div>
      <div style={{ fontSize: 8, letterSpacing: '0.15em', color: p.accentLight, textAlign: 'center', textTransform: 'uppercase', lineHeight: 2, marginTop: 14 }}>request the honour of your presence<br />at their marriage</div>
      <div style={{ width: 60, height: 1, background: p.border, margin: '16px auto' }} />
      <div style={{ fontSize: 9, letterSpacing: '0.22em', color: p.accentLight, textAlign: 'center', textTransform: 'uppercase', lineHeight: 2 }}>{t.day}<br />{t.date}</div>
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', color: p.accent, textTransform: 'uppercase' }}>{t.venue}</div>
        <div style={{ fontSize: 8.5, letterSpacing: '0.1em', color: p.accentLight, marginTop: 2 }}>{t.street} · {t.city}</div>
      </div>
      <div style={{ marginTop: 14, textAlign: 'center', fontSize: 8.5, letterSpacing: '0.1em', color: p.accentLight, lineHeight: 2 }}>
        {t.ceremony}<br />{t.cocktails}<br />{t.reception}
      </div>
      <div style={{ width: 60, height: 1, background: p.border, margin: '16px auto' }} />
      <div style={{ fontSize: 7.5, letterSpacing: '0.25em', color: p.border, textTransform: 'uppercase' }}>{t.dress}</div>
      <div style={{ fontSize: 7.5, letterSpacing: '0.2em', color: p.accentLight, marginTop: 6 }}>{t.site}</div>
    </div>
  )
}

function CardB_Invite({ t, p, font }) {
  const navy = p.pacific || '#1C3554'
  const rule = { display: 'flex', alignItems: 'center', gap: 10, margin: '16px auto', width: '70%' }
  const rl = { flex: 1, height: 1, background: p.border }
  const rd = { width: 4, height: 4, borderRadius: '50%', background: p.accent }
  return (
    <div style={{ width: 420, background: p.card, fontFamily: font, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '52px 44px', boxSizing: 'border-box', position: 'relative' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: `linear-gradient(180deg, ${p.accent}, ${p.bougainvillea||p.accent}, ${p.terracotta||p.accent})` }} />
      <div style={{ fontSize: 9, letterSpacing: '0.28em', color: navy, textTransform: 'uppercase', marginBottom: 18 }}>Wedding Invitation</div>
      <div style={{ fontSize: 9, color: p.terracotta||p.accent, textAlign: 'center', fontStyle: 'italic', lineHeight: 1.7, marginBottom: 14 }}>Together with their families</div>
      <div style={{ fontSize: 34, color: navy, textAlign: 'center', lineHeight: 1.1, fontStyle: 'italic' }}>{t.p1}</div>
      <div style={{ fontSize: 22, color: p.accent, margin: '4px 0' }}>&amp;</div>
      <div style={{ fontSize: 34, color: navy, textAlign: 'center', lineHeight: 1.1, fontStyle: 'italic' }}>{t.p2}</div>
      <div style={{ fontSize: 9, letterSpacing: '0.1em', color: navy, textAlign: 'center', lineHeight: 1.9, marginTop: 14 }}>request the honour of your presence<br />at their marriage</div>
      <div style={rule}><div style={rl} /><div style={rd} /><div style={rl} /></div>
      <div style={{ fontSize: 13, letterSpacing: '0.12em', color: navy, textAlign: 'center', marginBottom: 4 }}>{t.day}, {t.date}</div>
      <div style={rule}><div style={rl} /><div style={rd} /><div style={rl} /></div>
      <div style={{ textAlign: 'center', marginTop: 14 }}>
        <div style={{ fontSize: 12, color: navy, fontStyle: 'italic', marginBottom: 3 }}>{t.venue}</div>
        <div style={{ fontSize: 9.5, letterSpacing: '0.08em', color: p.terracotta||p.accent }}>{t.street} · {t.city}</div>
      </div>
      <div style={{ marginTop: 14, textAlign: 'center', fontSize: 9.5, color: navy, lineHeight: 2, fontStyle: 'italic' }}>
        {t.ceremony}<br />{t.cocktails}<br />{t.reception}
      </div>
      <div style={{ marginTop: 16, fontSize: 8, letterSpacing: '0.25em', color: p.accent, textTransform: 'uppercase' }}>{t.dress}</div>
    </div>
  )
}

function CardA_RSVP({ t, p, font }) {
  const radio = (label) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', border: `1px solid ${p.accent}`, flexShrink: 0 }} />
      <div style={{ fontSize: 8, letterSpacing: '0.15em', color: p.accentLight, textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
  return (
    <div style={{ width: 420, background: p.card, fontFamily: font, display: 'flex', flexDirection: 'column', padding: '44px 44px', boxSizing: 'border-box', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 10, border: `0.5px solid ${p.border}`, pointerEvents: 'none' }} />
      <div style={{ fontSize: 26, letterSpacing: '0.12em', color: p.accent, textAlign: 'center', marginBottom: 4 }}>{t.p1} &amp; {t.p2}</div>
      <div style={{ fontSize: 10, letterSpacing: '0.35em', color: p.accent, textTransform: 'uppercase', textAlign: 'center', marginBottom: 5 }}>Kindly Reply</div>
      <div style={{ fontSize: 8, letterSpacing: '0.18em', color: p.accentLight, textAlign: 'center', marginBottom: 22, textTransform: 'uppercase' }}>by {t.rsvpDate}</div>
      <div style={{ width: '100%', height: 0.5, background: p.border, margin: '4px 0 16px' }} />
      {[['Name(s)'], ['Number Attending'], ['Dietary Restrictions']].map(([lbl]) => (
        <div key={lbl} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 7, letterSpacing: '0.2em', color: p.accentLight, textTransform: 'uppercase', marginBottom: 6 }}>{lbl}</div>
          <div style={{ width: '100%', height: 0.5, background: p.accent, opacity: 0.4 }} />
        </div>
      ))}
      <div style={{ fontSize: 7, letterSpacing: '0.2em', color: p.accentLight, textTransform: 'uppercase', marginBottom: 10 }}>Accepts / Declines</div>
      {radio('Joyfully Accepts')}
      {radio('Regretfully Declines')}
    </div>
  )
}

function CardB_RSVP({ t, p, font }) {
  const navy = p.pacific || '#1C3554'
  const rule = { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }
  const rl = { flex: 1, height: 1, background: p.border }
  const rd = { width: 4, height: 4, borderRadius: '50%', background: p.accent }
  const radio = (label) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', border: `1px solid ${p.accent}`, flexShrink: 0 }} />
      <div style={{ fontSize: 9, letterSpacing: '0.1em', color: navy }}>{label}</div>
    </div>
  )
  return (
    <div style={{ width: 420, background: p.paper, fontFamily: font, display: 'flex', flexDirection: 'column', padding: '44px 44px', boxSizing: 'border-box', border: `1px solid ${p.border}`, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: p.accent }} />
      <div style={{ fontSize: 24, color: navy, textAlign: 'center', fontStyle: 'italic', marginBottom: 4 }}>Kindly Reply</div>
      <div style={{ fontSize: 9, letterSpacing: '0.15em', color: p.accent, textAlign: 'center', marginBottom: 20, textTransform: 'uppercase' }}>by {t.rsvpDate}</div>
      <div style={rule}><div style={rl} /><div style={rd} /><div style={rl} /></div>
      {[['Name(s)'], ['Number Attending'], ['Dietary Restrictions']].map(([lbl]) => (
        <div key={lbl} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 8, letterSpacing: '0.18em', color: p.terracotta||p.accent, textTransform: 'uppercase', marginBottom: 5 }}>{lbl}</div>
          <div style={{ width: '100%', height: 0.5, background: navy, opacity: 0.25 }} />
        </div>
      ))}
      <div style={{ fontSize: 8, letterSpacing: '0.18em', color: p.terracotta||p.accent, textTransform: 'uppercase', marginBottom: 10 }}>Accepts / Declines</div>
      {radio('Joyfully Accepts')}
      {radio('Regretfully Declines')}
    </div>
  )
}

function MenuLines({ text, accent, body }) {
  return text.split('\n').map((l, i) => (
    <div key={i} style={{ color: i === 0 ? accent : body, fontSize: i === 0 ? 10 : 8.5, lineHeight: 1.7 }}>{l}</div>
  ))
}

function CardA_Menu({ t, p, font }) {
  const Section = ({ title, children }) => (
    <div style={{ width: '100%', marginBottom: 18, textAlign: 'center' }}>
      <div style={{ fontSize: 7, letterSpacing: '0.4em', color: 'rgba(201,169,110,0.35)', textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
  return (
    <div style={{ width: 360, background: p.card, fontFamily: font, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 40px', boxSizing: 'border-box', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 10, border: `0.5px solid ${p.border}`, pointerEvents: 'none' }} />
      <div style={{ fontSize: 12, letterSpacing: '0.35em', color: p.accent, textTransform: 'uppercase', marginBottom: 4 }}>Dinner Menu</div>
      <div style={{ fontSize: 14, letterSpacing: '0.15em', color: p.accentLight, marginBottom: 22 }}>{t.p1} &amp; {t.p2}</div>
      <Section title="First Course"><MenuLines text={t.menuFirst} accent={p.accent} body={p.accentLight} /></Section>
      <div style={{ width: 40, height: 0.5, background: p.border, margin: '4px auto 18px' }} />
      <Section title="Main Course">
        <MenuLines text={t.menuMain1} accent={p.accent} body={p.accentLight} />
        <div style={{ height: 10 }} />
        <MenuLines text={t.menuMain2} accent={p.accent} body={p.accentLight} />
      </Section>
      <div style={{ width: 40, height: 0.5, background: p.border, margin: '4px auto 18px' }} />
      <Section title="Dessert"><MenuLines text={t.menuDessert} accent={p.accent} body={p.accentLight} /></Section>
    </div>
  )
}

function CardB_Menu({ t, p, font }) {
  const navy = p.pacific || '#1C3554'
  const rule = { display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0', width: '80%' }
  const rl = { flex: 1, height: 1, background: p.border }
  const rd = { width: 4, height: 4, borderRadius: '50%', background: p.accent }
  const Section = ({ title, children }) => (
    <div style={{ width: '100%', marginBottom: 14, textAlign: 'center' }}>
      <div style={{ fontSize: 8, letterSpacing: '0.3em', color: p.accent, textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
  return (
    <div style={{ width: 360, background: p.paper, fontFamily: font, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 40px', boxSizing: 'border-box', border: `1px solid ${p.border}`, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: p.accent }} />
      <div style={{ fontSize: 26, color: navy, marginBottom: 4, fontStyle: 'italic' }}>Dinner Menu</div>
      <div style={{ fontSize: 10, letterSpacing: '0.15em', color: p.accent, marginBottom: 22, textTransform: 'uppercase' }}>{t.p1} &amp; {t.p2}</div>
      <Section title="First Course"><MenuLines text={t.menuFirst} accent={navy} body={p.terracotta||p.accent} /></Section>
      <div style={rule}><div style={rl} /><div style={rd} /><div style={rl} /></div>
      <Section title="Main Course">
        <MenuLines text={t.menuMain1} accent={navy} body={p.terracotta||p.accent} />
        <div style={{ height: 10 }} />
        <MenuLines text={t.menuMain2} accent={navy} body={p.terracotta||p.accent} />
      </Section>
      <div style={rule}><div style={rl} /><div style={rd} /><div style={rl} /></div>
      <Section title="Dessert"><MenuLines text={t.menuDessert} accent={navy} body={p.terracotta||p.accent} /></Section>
    </div>
  )
}

function CardA_Welcome({ t, p, font }) {
  return (
    <div style={{ width: 380, background: p.card, fontFamily: font, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '52px 44px', boxSizing: 'border-box', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 10, border: `0.5px solid ${p.border}`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 16, border: `0.5px solid ${p.border}`, pointerEvents: 'none' }} />
      <div style={{ fontSize: 9, letterSpacing: '0.4em', color: p.accentLight, textTransform: 'uppercase', marginBottom: 16 }}>Welcome</div>
      <div style={{ fontSize: 38, letterSpacing: '0.08em', color: p.accent, textAlign: 'center', lineHeight: 1.1 }}>{t.p1}</div>
      <div style={{ fontSize: 24, color: p.accentLight, margin: '6px 0' }}>&amp;</div>
      <div style={{ fontSize: 38, letterSpacing: '0.08em', color: p.accent, textAlign: 'center', lineHeight: 1.1 }}>{t.p2}</div>
      <div style={{ width: 60, height: 1, background: p.border, margin: '20px auto' }} />
      <div style={{ fontSize: 10, letterSpacing: '0.2em', color: p.accentLight, textTransform: 'uppercase', textAlign: 'center', marginBottom: 4 }}>{t.day} · {t.date}</div>
      <div style={{ fontSize: 10, letterSpacing: '0.15em', color: p.accent, textAlign: 'center', marginTop: 12 }}>{t.venue}</div>
      <div style={{ fontSize: 9, letterSpacing: '0.12em', color: p.accentLight, textAlign: 'center', marginBottom: 20 }}>{t.city}</div>
      <div style={{ width: 60, height: 1, background: p.border, margin: '4px auto 18px' }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
        {[`Ceremony · ${t.ceremony}`, `Cocktails · ${t.cocktails.split('·')[0].trim()}`, `Reception · ${t.reception.split('·')[0].trim()}`].map(l => (
          <div key={l} style={{ fontSize: 7.5, letterSpacing: '0.22em', color: p.accentLight, textTransform: 'uppercase', textAlign: 'center' }}>{l}</div>
        ))}
      </div>
    </div>
  )
}

function CardB_Welcome({ t, p, font }) {
  const navy = p.pacific || '#1C3554'
  const rule = { display: 'flex', alignItems: 'center', gap: 10, margin: '18px auto', width: '75%' }
  const rl = { flex: 1, height: 1, background: p.border }
  const rd = { width: 4, height: 4, borderRadius: '50%', background: p.accent }
  return (
    <div style={{ width: 380, background: p.paper, fontFamily: font, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '52px 44px', boxSizing: 'border-box', border: `1px solid ${p.border}`, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: `linear-gradient(90deg, ${p.bougainvillea||p.accent}, ${p.accent}, ${p.terracotta||p.accent})` }} />
      <div style={{ fontSize: 10, letterSpacing: '0.3em', color: p.accent, textTransform: 'uppercase', marginBottom: 12 }}>Welcome</div>
      <div style={{ fontSize: 44, color: navy, textAlign: 'center', lineHeight: 1.05, fontStyle: 'italic' }}>{t.p1}</div>
      <div style={{ fontSize: 28, color: p.accent, margin: '4px 0' }}>&amp;</div>
      <div style={{ fontSize: 44, color: navy, textAlign: 'center', lineHeight: 1.05, fontStyle: 'italic' }}>{t.p2}</div>
      <div style={rule}><div style={rl} /><div style={rd} /><div style={rl} /></div>
      <div style={{ fontSize: 12, letterSpacing: '0.12em', color: navy, textAlign: 'center', marginBottom: 4 }}>{t.day}, {t.date}</div>
      <div style={{ ...rule, margin: '12px auto' }}><div style={rl} /><div style={rd} /><div style={rl} /></div>
      <div style={{ fontSize: 12, color: navy, fontStyle: 'italic', textAlign: 'center', marginBottom: 2 }}>{t.venue}</div>
      <div style={{ fontSize: 9.5, color: p.terracotta||p.accent, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{t.city}</div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, marginTop: 18 }}>
        {[`Ceremony · ${t.ceremony}`, `Cocktail Hour · ${t.cocktails.split('·')[0].trim()}`, `Reception · ${t.reception.split('·')[0].trim()}`].map(l => (
          <div key={l} style={{ fontSize: 9, letterSpacing: '0.1em', color: navy, fontStyle: 'italic', textAlign: 'center' }}>{l}</div>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: p.accent }} />
    </div>
  )
}

const PIECE_MAP = {
  std:     { A: CardA_STD,     B: CardB_STD     },
  invite:  { A: CardA_Invite,  B: CardB_Invite  },
  rsvp:    { A: CardA_RSVP,    B: CardB_RSVP    },
  menu:    { A: CardA_Menu,    B: CardB_Menu     },
  welcome: { A: CardA_Welcome, B: CardB_Welcome  },
}

// ─── Pinterest panel ─────────────────────────────────────────────────────────

function PinterestPanel() {
  const [input, setInput] = useState('')
  const [boards, setBoards] = useState([])
  const [showEmbed, setShowEmbed] = useState(null)

  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem('dk_pin_boards') || '[]'); if (s.length) setBoards(s) } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem('dk_pin_boards', JSON.stringify(boards))
  }, [boards])

  useEffect(() => {
    if (!showEmbed) return
    const existing = document.querySelector('script[src*="pinit.js"]')
    if (!existing) {
      const s = document.createElement('script')
      s.async = true; s.defer = true
      s.src = '//assets.pinterest.com/js/pinit.js'
      document.head.appendChild(s)
    } else if (window.parsePins) { window.parsePins() }
  }, [showEmbed])

  const addBoard = () => {
    const url = input.trim()
    if (!url || !url.includes('pinterest')) return
    setBoards(prev => [...prev.filter(b => b !== url), url])
    setInput('')
  }

  const inp = { width: '100%', background: '#111', border: '1px solid rgba(201,169,110,0.22)', color: '#E8D9B8', fontSize: 11, padding: '6px 8px', borderRadius: 4, boxSizing: 'border-box', outline: 'none', fontFamily: 'DM Sans, sans-serif' }
  const btnSolid = { background: 'var(--gold)', border: 'none', color: '#0A0A0A', borderRadius: 4, padding: '6px 10px', fontSize: 10, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.04em', fontWeight: 600 }
  const btnGhost = { background: 'transparent', border: '1px solid rgba(201,169,110,0.3)', color: 'var(--gold)', borderRadius: 4, padding: '5px 8px', fontSize: 9, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input style={inp} placeholder="Paste a Pinterest board URL…" value={input}
        onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addBoard()} />
      <button style={btnSolid} onClick={addBoard}>+ Save Board</button>

      {boards.length > 0 && boards.map((url, i) => {
        const name = url.replace(/https?:\/\/(www\.)?pinterest\.com\//, '').replace(/\/$/, '') || url
        return (
          <div key={i} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <button style={{ ...btnGhost, flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 9 }}
              onClick={() => setShowEmbed(showEmbed === url ? null : url)}>
              {showEmbed === url ? '▼' : '▶'} {name}
            </button>
            <button style={{ background: 'none', border: 'none', color: 'rgba(201,169,110,0.5)', cursor: 'pointer', fontSize: 14 }}
              onClick={() => window.open(url, '_blank')} title="Open in Pinterest">↗</button>
            <button style={{ background: 'none', border: 'none', color: 'rgba(201,169,110,0.35)', cursor: 'pointer', fontSize: 16 }}
              onClick={() => setBoards(prev => prev.filter((_, j) => j !== i))}>×</button>
          </div>
        )
      })}

      {showEmbed && (
        <div style={{ marginTop: 8, borderTop: '1px solid rgba(201,169,110,0.12)', paddingTop: 12 }}>
          <a data-pin-do="embedBoard" data-pin-board-width="240" data-pin-scale-height="180" data-pin-scale-width="60" href={showEmbed} />
          <div style={{ fontSize: 8, color: 'rgba(201,169,110,0.35)', marginTop: 6, textAlign: 'center' }}>Board may take a moment to load</div>
        </div>
      )}

      <button style={{ ...btnGhost, marginTop: 2, fontSize: 9 }}
        onClick={() => window.open('https://www.pinterest.com/search/boards/?q=wedding+stationery+old+hollywood+noir', '_blank')}>
        Browse Old Hollywood Wedding Inspo ↗
      </button>
      <button style={{ ...btnGhost, fontSize: 9 }}
        onClick={() => window.open('https://www.pinterest.com/search/boards/?q=wedding+stationery+mediterranean+coastal', '_blank')}>
        Browse Coastal Mediterranean Inspo ↗
      </button>
    </div>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({ text, setText, colors, setColors, fonts, setFonts }) {
  const [tab, setTab] = useState('design')

  const inp = { background: '#111', border: '1px solid rgba(201,169,110,0.2)', color: '#E8D9B8', fontSize: 11, padding: '5px 7px', borderRadius: 3, outline: 'none', fontFamily: 'DM Sans, sans-serif', width: '100%', boxSizing: 'border-box' }
  const ta = { ...inp, resize: 'vertical', minHeight: 54, fontSize: 10 }
  const lbl = { fontSize: 8, letterSpacing: '0.18em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }
  const sec = { fontSize: 8, letterSpacing: '0.28em', color: 'var(--gold)', textTransform: 'uppercase', borderBottom: '1px solid rgba(201,169,110,0.12)', paddingBottom: 6, marginBottom: 10, marginTop: 12 }
  const tabBtn = (active) => ({ flex: 1, background: 'none', border: 'none', borderBottom: active ? '1.5px solid var(--gold)' : '1.5px solid transparent', color: active ? 'var(--gold)' : 'rgba(201,169,110,0.4)', fontSize: 9, letterSpacing: '0.1em', padding: '7px 0', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase' })

  const colorRow = (label, key, dir) => (
    <div key={`${dir}-${key}`} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <input type="color" value={colors[dir][key] || '#888'}
        onChange={e => setColors(prev => ({ ...prev, [dir]: { ...prev[dir], [key]: e.target.value } }))}
        style={{ width: 28, height: 28, border: '1px solid rgba(201,169,110,0.2)', background: 'none', cursor: 'pointer', padding: 2, borderRadius: 4 }}
      />
      <span style={{ fontSize: 9, color: 'rgba(201,169,110,0.55)', letterSpacing: '0.06em' }}>{label}</span>
    </div>
  )

  const TextField = ({ label: l, fkey, multiline }) => (
    <div style={{ marginBottom: 10 }}>
      <label style={lbl}>{l}</label>
      {multiline
        ? <textarea style={ta} value={text[fkey]} onChange={e => setText(p => ({ ...p, [fkey]: e.target.value }))} />
        : <input style={inp} value={text[fkey]} onChange={e => setText(p => ({ ...p, [fkey]: e.target.value }))} />
      }
    </div>
  )

  return (
    <div style={{ width: 272, background: '#080808', borderLeft: '1px solid rgba(201,169,110,0.1)', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(201,169,110,0.1)', padding: '0 2px' }}>
        {[['design', 'Design'], ['text', 'Text'], ['inspo', 'Pinterest']].map(([id, l]) => (
          <button key={id} style={tabBtn(tab === id)} onClick={() => setTab(id)}>{l}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 32px' }}>

        {tab === 'design' && (<>
          <div style={sec}>Direction A · Noir Gatsby</div>
          <div style={{ marginBottom: 10 }}>
            <label style={lbl}>Headline Font</label>
            <select value={fonts.a} onChange={e => setFonts(p => ({ ...p, a: e.target.value }))} style={inp}>
              {HEADLINE_FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          {colorRow('Card Background', 'card', 'a')}
          {colorRow('Gold Accent', 'accent', 'a')}
          {colorRow('Light Accent', 'accentLight', 'a')}
          {colorRow('Crimson', 'crimson', 'a')}

          <div style={sec}>Direction B · La Valencia</div>
          <div style={{ marginBottom: 10 }}>
            <label style={lbl}>Headline Font</label>
            <select value={fonts.b} onChange={e => setFonts(p => ({ ...p, b: e.target.value }))} style={inp}>
              {HEADLINE_FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          {colorRow('Pacific Deep', 'pacific', 'b')}
          {colorRow('Coastal Gold', 'accent', 'b')}
          {colorRow('Stucco / Light', 'accentLight', 'b')}
          {colorRow('Bougainvillea', 'bougainvillea', 'b')}
          {colorRow('Terracotta', 'terracotta', 'b')}
          {colorRow('Paper / Background', 'paper', 'b')}
        </>)}

        {tab === 'text' && (<>
          <div style={sec}>The Couple</div>
          <TextField label="Partner 1 (first name)" fkey="p1" />
          <TextField label="Partner 2 (first name)" fkey="p2" />
          <TextField label="Last names" fkey="lastName" />

          <div style={sec}>Date &amp; Time</div>
          <TextField label="Full Date" fkey="date" />
          <TextField label="Short Date" fkey="shortDate" />
          <TextField label="Day of Week" fkey="day" />
          <TextField label="Ceremony Time" fkey="ceremony" />
          <TextField label="Cocktail Hour" fkey="cocktails" />
          <TextField label="Reception" fkey="reception" />
          <TextField label="RSVP Deadline" fkey="rsvpDate" />

          <div style={sec}>Venue</div>
          <TextField label="Venue Name" fkey="venue" />
          <TextField label="Street Address" fkey="street" />
          <TextField label="City, State" fkey="city" />

          <div style={sec}>Details</div>
          <TextField label="Dress Code" fkey="dress" />
          <TextField label="Wedding Website" fkey="site" />

          <div style={sec}>Menu (line 1 = dish name)</div>
          <TextField label="First Course" fkey="menuFirst" multiline />
          <TextField label="Main Course 1" fkey="menuMain1" multiline />
          <TextField label="Main Course 2" fkey="menuMain2" multiline />
          <TextField label="Dessert" fkey="menuDessert" multiline />
        </>)}

        {tab === 'inspo' && (<>
          <div style={sec}>Pinterest Inspiration</div>
          <PinterestPanel />
        </>)}
      </div>
    </div>
  )
}

// ─── Main canvas ─────────────────────────────────────────────────────────────

function Canvas({ piece, view, text, colors, fonts }) {
  const comps = PIECE_MAP[piece] || PIECE_MAP.std
  const scale = view === 'compare' ? 0.78 : 1

  const CardWrap = ({ C, dir }) => (
    <div style={{ flexShrink: 0, transform: `scale(${scale})`, transformOrigin: 'top center', boxShadow: '0 16px 56px rgba(0,0,0,0.55)', transition: 'transform 0.2s' }}>
      <C t={text} p={{ ...PALETTES[dir], ...colors[dir] }} font={fonts[dir]} />
    </div>
  )

  return (
    <div style={{
      flex: 1, overflowY: 'auto', overflowX: 'auto',
      background: '#0A0A0A',
      display: 'flex', alignItems: view === 'compare' ? 'flex-start' : 'center',
      justifyContent: 'center',
      padding: view === 'compare' ? '28px 16px' : '40px 24px',
      gap: 48,
    }}>
      {(view === 'a' || view === 'compare') && <CardWrap C={comps.A} dir="a" />}
      {(view === 'b' || view === 'compare') && <CardWrap C={comps.B} dir="b" />}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Theme() {
  const [piece, setPiece] = useState('std')
  const [view, setView] = useState('a')
  const [text, setText] = useState(DEFAULT_TEXT)
  const [colors, setColors] = useState({ a: { ...PALETTES.a }, b: { ...PALETTES.b } })
  const [fonts, setFonts] = useState({ a: PALETTES.a.font, b: PALETTES.b.font })

  // Inject Google Fonts
  useEffect(() => {
    if (document.getElementById('dk-gfonts')) return
    const l = document.createElement('link')
    l.id = 'dk-gfonts'; l.rel = 'stylesheet'
    l.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=EB+Garamond:ital,wght@0,400;1,400&family=Great+Vibes&display=swap'
    document.head.appendChild(l)
  }, [])

  const activeTab = (a) => ({ background: 'none', border: 'none', borderBottom: a ? '1.5px solid var(--gold)' : '1.5px solid transparent', color: a ? 'var(--gold)' : 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.72rem', letterSpacing: '0.06em', padding: '0 11px', height: 42, cursor: 'pointer', whiteSpace: 'nowrap' })
  const viewBtn = (a) => ({ background: a ? 'rgba(201,169,110,0.14)' : 'none', border: `1px solid ${a ? 'var(--gold)' : 'rgba(201,169,110,0.2)'}`, color: a ? 'var(--gold)' : 'var(--text-muted)', borderRadius: 4, padding: '3px 10px', fontSize: 9, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.04em' })

  return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0A0A0A' }}>
      {/* Piece tab bar + view toggles */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid rgba(201,169,110,0.1)', background: 'var(--card)', flexShrink: 0, height: 44 }}>
        <nav style={{ display: 'flex', height: '100%' }}>
          {PIECES.map(p => (
            <button key={p.id} style={activeTab(piece === p.id)} onClick={() => setPiece(p.id)}>{p.label}</button>
          ))}
        </nav>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 8, letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>View</span>
          {[['a', 'Noir A'], ['b', 'Valencia B'], ['compare', 'Compare']].map(([v, l]) => (
            <button key={v} style={viewBtn(view === v)} onClick={() => setView(v)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Canvas piece={piece} view={view} text={text} colors={colors} fonts={fonts} />
        <Sidebar text={text} setText={setText} colors={colors} setColors={setColors} fonts={fonts} setFonts={setFonts} />
      </div>
    </div>
  )
}

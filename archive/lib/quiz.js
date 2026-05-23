// ─── Axes ────────────────────────────────────────────────────────────────────
export const AXES = {
  EXP:  { label: 'Experience',     description: 'Emotional feeling over visual presentation' },
  AES:  { label: 'Aesthetics',     description: 'Visual beauty and design importance' },
  CONV: { label: 'Convenience',    description: 'Simplicity and streamlined planning' },
  CUST: { label: 'Customization',  description: 'Personalizing every detail' },
  INT:  { label: 'Intimacy',       description: 'Guest count — intimate vs. inclusive' },
  SCL:  { label: 'Energy',         description: 'Party energy and celebration intensity' },
  STR:  { label: 'Structure',      description: 'Planning control and precision' },
  FLX:  { label: 'Flexibility',    description: 'Openness to surprises and spontaneity' },
  BUD:  { label: 'Budget',         description: 'Financial pragmatism' },
  VIS:  { label: 'Vision',         description: 'Strength of your specific vision' },
}

// ─── Questions ───────────────────────────────────────────────────────────────
// type: 'choice' | 'rating' | 'rank'
// choice options: { label, scores: { AXIS: 1-10 } }
// rating: { low, high, axes: [{ axis, inverted? }] }
// rank options: { label, scores: { AXIS: weight 0.0-1.0 } }
export const QUESTIONS = [
  // ── Group 1: Core Vision (Q1–Q5) ─────────────────────────────────────────
  {
    id: 'q1',
    group: 'Core Vision',
    text: 'When you picture your wedding day, what matters most?',
    type: 'choice',
    options: [
      { label: 'How it feels — the emotion, the magic, the memory',   scores: { EXP: 9, AES: 3 } },
      { label: 'How it looks — the beauty, the details, the photos',  scores: { EXP: 3, AES: 9 } },
      { label: 'Both equally',                                        scores: { EXP: 6, AES: 6 } },
    ],
  },
  {
    id: 'q2',
    group: 'Core Vision',
    text: 'Which best describes your vision?',
    type: 'choice',
    options: [
      { label: 'A specific mood or feeling I can already imagine',     scores: { EXP: 8, AES: 5, VIS: 8 } },
      { label: 'A visual aesthetic I\'ve been collecting inspiration for', scores: { EXP: 4, AES: 9, VIS: 9 } },
      { label: 'Something unforgettable — I\'ll know it when I see it', scores: { EXP: 7, AES: 6, VIS: 4 } },
      { label: 'I\'m pretty open — excited to discover it together',   scores: { EXP: 5, AES: 5, VIS: 2 } },
    ],
  },
  {
    id: 'q3',
    group: 'Core Vision',
    text: 'Guest comfort vs. visual impact — where do you land?',
    type: 'rating',
    low: 'Guest comfort comes first',
    high: 'Visual impact comes first',
    axes: [
      { axis: 'AES' },
      { axis: 'INT', inverted: true },
    ],
  },
  {
    id: 'q4',
    group: 'Core Vision',
    text: 'Rank what matters most on your wedding day (top to bottom):',
    type: 'rank',
    options: [
      { label: 'The atmosphere and emotional tone',       scores: { EXP: 1.0 } },
      { label: 'Amazing food and drinks',                 scores: { CONV: 0.6, SCL: 0.4 } },
      { label: 'Stunning design and décor',               scores: { AES: 1.0 } },
      { label: 'The meaning and ceremony',                scores: { EXP: 0.8, INT: 0.2 } },
      { label: 'Dancing and entertainment all night',     scores: { SCL: 1.0 } },
    ],
  },
  {
    id: 'q5',
    group: 'Core Vision',
    text: 'If you had to pick just one, your ideal wedding is:',
    type: 'choice',
    options: [
      { label: 'Deeply intimate — just the people who truly matter',  scores: { EXP: 8, INT: 1, SCL: 3 } },
      { label: 'Breathtakingly beautiful — every detail curated',     scores: { AES: 9, VIS: 8, CUST: 7 } },
      { label: 'An epic celebration — everyone dancing all night',    scores: { SCL: 10, INT: 9, EXP: 6 } },
    ],
  },

  // ── Group 2: Tradeoffs (Q6–Q10) ───────────────────────────────────────────
  {
    id: 'q6',
    group: 'Tradeoffs',
    text: 'When planning, you prefer to:',
    type: 'choice',
    options: [
      { label: 'Elevate one or two things to perfection',             scores: { CUST: 8, VIS: 8, CONV: 3 } },
      { label: 'Balance everything at a good level',                  scores: { CONV: 8, CUST: 3, BUD: 7 } },
    ],
  },
  {
    id: 'q7',
    group: 'Tradeoffs',
    text: 'If your budget got cut 20%, you\'d first reduce:',
    type: 'choice',
    options: [
      { label: 'Décor and florals',                                   scores: { BUD: 7, AES: 3, VIS: 3 } },
      { label: 'Food and catering quality',                           scores: { BUD: 7, SCL: 4, CONV: 6 } },
      { label: 'Entertainment and extras',                            scores: { BUD: 7, SCL: 3 } },
      { label: 'I wouldn\'t — I\'d find a way to keep it all',        scores: { BUD: 1, VIS: 8, CUST: 7 } },
    ],
  },
  {
    id: 'q8',
    group: 'Tradeoffs',
    text: 'Quality over quantity — or quantity over quality?',
    type: 'rating',
    low: 'Quality — fewer, better things',
    high: 'Quantity — more people, more moments',
    axes: [
      { axis: 'INT' },
      { axis: 'AES', inverted: true },
    ],
  },
  {
    id: 'q9',
    group: 'Tradeoffs',
    text: 'Where would you rather splurge?',
    type: 'choice',
    options: [
      { label: 'The venue itself — it sets the whole tone',           scores: { AES: 8, EXP: 7, CONV: 5 } },
      { label: 'Styling and décor — transform any space',             scores: { CUST: 9, AES: 8, BUD: 2 } },
    ],
  },
  {
    id: 'q10',
    group: 'Tradeoffs',
    text: 'How specific is your vision right now?',
    type: 'rating',
    low: 'Very open — I\'ll love many directions',
    high: 'Crystal clear — I know exactly what I want',
    axes: [
      { axis: 'VIS' },
      { axis: 'FLX', inverted: true },
    ],
  },

  // ── Group 3: Venue DNA (Q11–Q16) ──────────────────────────────────────────
  {
    id: 'q11',
    group: 'Venue DNA',
    text: 'Your ideal venue is:',
    type: 'choice',
    options: [
      { label: 'A complete venue — beautiful as-is, minimal styling needed', scores: { CONV: 9, AES: 6 } },
      { label: 'A blank canvas — we bring our own vision to life',           scores: { CUST: 9, VIS: 8, AES: 7 } },
    ],
  },
  {
    id: 'q12',
    group: 'Venue DNA',
    text: 'Having everything in-house (catering, staff, décor) matters to me:',
    type: 'rating',
    low: 'Not at all — I want to choose every vendor',
    high: 'A lot — simplicity is everything',
    axes: [{ axis: 'CONV' }],
  },
  {
    id: 'q13',
    group: 'Venue DNA',
    text: 'Ceremony and reception at the same place, or separate locations?',
    type: 'choice',
    options: [
      { label: 'Same place — seamless flow, no logistical stress',    scores: { CONV: 9, EXP: 6 } },
      { label: 'Different places — each with its own special feel',   scores: { CUST: 7, EXP: 8, VIS: 6 } },
    ],
  },
  {
    id: 'q14',
    group: 'Venue DNA',
    text: 'Working with the venue\'s preferred vendors vs. bringing your own:',
    type: 'rating',
    low: 'Total freedom — I want to choose everyone',
    high: 'Preferred vendors are fine — I trust the process',
    axes: [
      { axis: 'CONV' },
      { axis: 'CUST', inverted: true },
      { axis: 'STR', inverted: true },
    ],
  },
  {
    id: 'q15',
    group: 'Venue DNA',
    text: 'Which setting speaks to you most?',
    type: 'choice',
    options: [
      { label: 'Polished and refined — timeless elegance',            scores: { AES: 8, CONV: 7, VIS: 5 } },
      { label: 'Natural and organic — gardens, light, open air',      scores: { EXP: 8, FLX: 6, AES: 6 } },
      { label: 'Unique and unexpected — a space no one expects',      scores: { CUST: 8, AES: 7, VIS: 8 } },
      { label: 'Architectural and dramatic — bold, memorable',        scores: { AES: 9, VIS: 8, STR: 5 } },
    ],
  },
  {
    id: 'q16',
    group: 'Venue DNA',
    text: 'How important is it that your venue feels truly unique?',
    type: 'rating',
    low: 'Not very — I care more about function',
    high: 'Essential — I want a venue no one\'s seen before',
    axes: [
      { axis: 'VIS' },
      { axis: 'CUST' },
    ],
  },

  // ── Group 4: Scale & Energy (Q17–Q21) ─────────────────────────────────────
  {
    id: 'q17',
    group: 'Scale & Energy',
    text: 'How many guests feels right to you?',
    type: 'choice',
    options: [
      { label: 'Under 75 — the people who really matter',            scores: { INT: 1, SCL: 3 } },
      { label: '75–150 — intimate but celebratory',                  scores: { INT: 4, SCL: 5 } },
      { label: '150–250 — a real celebration',                       scores: { INT: 7, SCL: 7 } },
      { label: '250+ — go big or go home',                           scores: { INT: 10, SCL: 9 } },
    ],
  },
  {
    id: 'q18',
    group: 'Scale & Energy',
    text: 'How important is it to include everyone you care about?',
    type: 'rating',
    low: 'I\'d rather keep it small and intentional',
    high: 'I want everyone there — no one left out',
    axes: [{ axis: 'INT' }],
  },
  {
    id: 'q19',
    group: 'Scale & Energy',
    text: 'Your dream reception looks more like:',
    type: 'choice',
    options: [
      { label: 'Deep connection — long conversations, unhurried moments', scores: { EXP: 9, INT: 1, SCL: 2 } },
      { label: 'A massive celebration — the dancefloor never empties',    scores: { SCL: 10, INT: 9, EXP: 6 } },
    ],
  },
  {
    id: 'q20',
    group: 'Scale & Energy',
    text: 'How important is dancing to you?',
    type: 'rating',
    low: 'Not important — dancing isn\'t our thing',
    high: 'Central — we want a full dancefloor all night',
    axes: [{ axis: 'SCL' }],
  },
  {
    id: 'q21',
    group: 'Scale & Energy',
    text: 'Rank your reception priorities (top to bottom):',
    type: 'rank',
    options: [
      { label: 'A meaningful, memorable ceremony',      scores: { EXP: 1.0 } },
      { label: 'An incredible dinner experience',       scores: { EXP: 0.5, CONV: 0.5 } },
      { label: 'Dancing and live music all night',      scores: { SCL: 1.0 } },
      { label: 'Mingling and connecting with guests',   scores: { SCL: 0.5, INT: 0.5 } },
      { label: 'Unique touches and special moments',    scores: { CUST: 1.0 } },
    ],
  },

  // ── Group 5: Planning Style (Q22–Q25) ─────────────────────────────────────
  {
    id: 'q22',
    group: 'Planning Style',
    text: 'Your ideal planning process is:',
    type: 'choice',
    options: [
      { label: 'Streamlined — experts guide us, fewer decisions',     scores: { CONV: 9, FLX: 7, CUST: 2 } },
      { label: 'Full freedom — we design every element ourselves',    scores: { CUST: 9, STR: 7, CONV: 2 } },
    ],
  },
  {
    id: 'q23',
    group: 'Planning Style',
    text: 'How much do you enjoy the planning process itself?',
    type: 'rating',
    low: 'Not at all — I want it done',
    high: 'A lot — this is part of the fun',
    axes: [
      { axis: 'CUST' },
      { axis: 'STR' },
    ],
  },
  {
    id: 'q24',
    group: 'Planning Style',
    text: 'How much does complexity stress you out?',
    type: 'rating',
    low: 'Not at all — I can handle a lot',
    high: 'A lot — I want simple and manageable',
    axes: [{ axis: 'CONV' }],
  },
  {
    id: 'q25',
    group: 'Planning Style',
    text: 'When it comes to expert guidance:',
    type: 'choice',
    options: [
      { label: 'I trust the pros — their recommendations make it easier', scores: { CONV: 8, FLX: 7, CUST: 2 } },
      { label: 'I want total creative freedom — I\'ll hire my own team',   scores: { CUST: 9, STR: 8, CONV: 1 } },
    ],
  },

  // ── Group 6: Budget (Q26–Q30) ─────────────────────────────────────────────
  {
    id: 'q26',
    group: 'Budget',
    text: 'When it comes to budget:',
    type: 'choice',
    options: [
      { label: 'We stay in budget — full stop',                       scores: { BUD: 10, VIS: 3 } },
      { label: 'We might stretch a little if the vision demands it',  scores: { BUD: 2, VIS: 8, CUST: 6 } },
    ],
  },
  {
    id: 'q27',
    group: 'Budget',
    text: 'Budget guides our decisions:',
    type: 'rating',
    low: 'Loosely — we\'ll find the money for what matters',
    high: 'Strictly — every decision goes through the budget',
    axes: [{ axis: 'BUD' }],
  },
  {
    id: 'q28',
    group: 'Budget',
    text: 'You prefer spending to be:',
    type: 'choice',
    options: [
      { label: 'Predictable — I want to know what everything costs upfront', scores: { STR: 8, BUD: 8 } },
      { label: 'Flexible — we\'ll adjust as we go based on what we love',    scores: { FLX: 8, BUD: 3 } },
    ],
  },
  {
    id: 'q29',
    group: 'Budget',
    text: 'Simplifying the vendor count to reduce cost and complexity:',
    type: 'rating',
    low: 'No — I want the best person for each role',
    high: 'Yes — fewer vendors means less to manage',
    axes: [
      { axis: 'CONV' },
      { axis: 'BUD' },
    ],
  },
  {
    id: 'q30',
    group: 'Budget',
    text: 'You\'d rather:',
    type: 'choice',
    options: [
      { label: 'Get the best value — smart spending across everything', scores: { BUD: 9, CONV: 7 } },
      { label: 'Maximum impact — spend where it counts most',           scores: { EXP: 8, BUD: 2, CUST: 6 } },
    ],
  },

  // ── Group 7: Emotional Core (Q31–Q33) ─────────────────────────────────────
  {
    id: 'q31',
    group: 'Emotional Core',
    text: 'Which would you regret more?',
    type: 'choice',
    options: [
      { label: 'That we didn\'t make it special enough — it felt ordinary', scores: { VIS: 9, EXP: 8, BUD: 2 } },
      { label: 'That we overspent and felt the stress for months after',    scores: { BUD: 9, CONV: 6 } },
    ],
  },
  {
    id: 'q32',
    group: 'Emotional Core',
    text: 'I worry the wedding won\'t feel significant enough:',
    type: 'rating',
    low: 'Not at all — I\'m at peace with any celebration',
    high: 'Often — I need it to feel truly memorable',
    axes: [
      { axis: 'VIS' },
      { axis: 'SCL' },
    ],
  },
  {
    id: 'q33',
    group: 'Emotional Core',
    text: 'I worry about overspending or going over budget:',
    type: 'rating',
    low: 'Rarely — it\'s a once-in-a-lifetime day',
    high: 'A lot — financial stress would ruin the joy',
    axes: [{ axis: 'BUD' }],
  },
]

// ─── Archetypes ───────────────────────────────────────────────────────────────
// fingerprint: { EXP, AES, CONV, CUST, INT, SCL, STR, FLX, BUD, VIS } all 1–10
export const ARCHETYPES = [
  {
    id: 'romantic',
    label: 'The Romantic',
    color: '#C9384F',
    tagline: 'Feeling over everything',
    description: 'You want a wedding that moves people. The emotion, the magic, the intimacy — those are non-negotiable. Beauty matters, but only if it serves the feeling.',
    fingerprint: { EXP:9, AES:5, CONV:4, CUST:6, INT:2, SCL:3, STR:4, FLX:6, BUD:4, VIS:5 },
  },
  {
    id: 'aesthete',
    label: 'The Aesthete',
    color: '#8B4FCC',
    tagline: 'Vision with obsessive detail',
    description: 'You\'ve been collecting inspiration for years. Every element should be considered, intentional, and exquisite. You\'ll lose sleep over the wrong shade of linen.',
    fingerprint: { EXP:6, AES:10, CONV:3, CUST:8, INT:4, SCL:4, STR:7, FLX:2, BUD:3, VIS:9 },
  },
  {
    id: 'pragmatist',
    label: 'The Pragmatist',
    color: '#4A7C59',
    tagline: 'Beautiful, efficient, done',
    description: 'You want a wedding that looks and feels great without the stress spiral. Experts guide, decisions stay clean, and the budget is respected. That\'s the dream.',
    fingerprint: { EXP:5, AES:5, CONV:9, CUST:3, INT:5, SCL:5, STR:6, FLX:5, BUD:9, VIS:3 },
  },
  {
    id: 'celebrant',
    label: 'The Celebrant',
    color: '#D4A843',
    tagline: 'Everyone in the room',
    description: 'The more the merrier. You want the full table, the full dancefloor, the full experience. A wedding is a party, and you want every person you love to be part of it.',
    fingerprint: { EXP:7, AES:5, CONV:5, CUST:4, INT:10, SCL:10, STR:5, FLX:6, BUD:4, VIS:5 },
  },
  {
    id: 'director',
    label: 'The Director',
    color: '#2C5F8A',
    tagline: 'Total creative control',
    description: 'You have a clear vision and a plan to execute it. Every vendor is handpicked. Every moment is intentional. You\'re not difficult — you just know exactly what you want.',
    fingerprint: { EXP:6, AES:7, CONV:3, CUST:9, INT:5, SCL:5, STR:10, FLX:1, BUD:5, VIS:9 },
  },
  {
    id: 'visionary',
    label: 'The Visionary',
    color: '#8B2FC9',
    tagline: 'Unforgettable at any cost',
    description: 'You\'re building something no one has seen before. The vision is strong, the aesthetic is distinct, and you\'re willing to stretch for it. Budget is a guideline, not a ceiling.',
    fingerprint: { EXP:9, AES:9, CONV:2, CUST:8, INT:4, SCL:5, STR:6, FLX:3, BUD:2, VIS:10 },
  },
  {
    id: 'collaborator',
    label: 'The Collaborator',
    color: '#3A8C8C',
    tagline: 'Open, trusting, present',
    description: 'You\'re here for the day, not the planning. You trust the people around you, love a good surprise, and care more about being present than being perfect.',
    fingerprint: { EXP:6, AES:5, CONV:7, CUST:2, INT:5, SCL:6, STR:3, FLX:10, BUD:6, VIS:2 },
  },
  {
    id: 'minimalist',
    label: 'The Minimalist',
    color: '#6B6B6B',
    tagline: 'Refined, considered, calm',
    description: 'Less is more. You want deliberate choices, clean execution, and a day that doesn\'t feel cluttered or overwhelming. Beauty through restraint.',
    fingerprint: { EXP:6, AES:8, CONV:9, CUST:3, INT:2, SCL:3, STR:7, FLX:5, BUD:7, VIS:6 },
  },
  {
    id: 'host',
    label: 'The Host',
    color: '#CC5500',
    tagline: 'Everyone fed, everyone happy',
    description: 'A great wedding means great hospitality. You want your guests comfortable, the energy high, and the experience generous. Making people feel welcome is the whole point.',
    fingerprint: { EXP:8, AES:5, CONV:6, CUST:4, INT:9, SCL:9, STR:5, FLX:7, BUD:4, VIS:4 },
  },
  {
    id: 'curator',
    label: 'The Curator',
    color: '#8B4513',
    tagline: 'Every detail handpicked',
    description: 'You think of your wedding like a gallery: each vendor, each detail, each moment is personally selected. Nothing generic. Nothing off the shelf. Everything you.',
    fingerprint: { EXP:6, AES:9, CONV:2, CUST:10, INT:4, SCL:4, STR:7, FLX:3, BUD:3, VIS:8 },
  },
]

// ─── Scoring ──────────────────────────────────────────────────────────────────
const POSITION_SCORES = [10, 8, 6, 4, 2]

export function calculateAxisScores(answers) {
  // answers: { [questionId]: rawValue }
  // choice → option index (number)
  // rating → 1–7 (number)
  // rank   → ordered array of option indices
  const axisData = {}

  const push = (axis, val) => {
    if (!axisData[axis]) axisData[axis] = []
    axisData[axis].push(Math.max(1, Math.min(10, val)))
  }

  for (const q of QUESTIONS) {
    const ans = answers[q.id]
    if (ans == null) continue

    if (q.type === 'choice') {
      const opt = q.options[ans]
      if (!opt) continue
      Object.entries(opt.scores).forEach(([axis, val]) => push(axis, val))
    } else if (q.type === 'rating') {
      // Normalize 1–7 → 1–10
      const normalized = ((ans - 1) / 6) * 9 + 1
      q.axes.forEach(({ axis, inverted }) => {
        push(axis, inverted ? 11 - normalized : normalized)
      })
    } else if (q.type === 'rank') {
      // ans = [optIdx0, optIdx1, ...] in ranked order (first = most important)
      ans.forEach((optIdx, position) => {
        const opt = q.options[optIdx]
        if (!opt) return
        const posScore = POSITION_SCORES[position] ?? 2
        Object.entries(opt.scores).forEach(([axis, weight]) => {
          push(axis, posScore * weight)
        })
      })
    }
  }

  const scores = {}
  for (const axis of Object.keys(AXES)) {
    const vals = axisData[axis]
    scores[axis] = vals && vals.length > 0
      ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
      : 5
  }
  return scores
}

export function determineArchetype(axisScores) {
  let bestMatch = null
  let bestDist = Infinity

  for (const arch of ARCHETYPES) {
    let distSq = 0
    for (const axis of Object.keys(AXES)) {
      const diff = (axisScores[axis] ?? 5) - arch.fingerprint[axis]
      distSq += diff * diff
    }
    const dist = Math.sqrt(distSq)
    if (dist < bestDist) {
      bestDist = dist
      bestMatch = arch
    }
  }
  return bestMatch
}

// Axis weights for compatibility scoring
const AXIS_WEIGHTS = {
  EXP: 1.2,
  AES: 1.0,
  CONV: 1.0,
  CUST: 1.2,
  INT: 1.5,
  SCL: 1.2,
  STR: 0.8,
  FLX: 0.8,
  BUD: 1.5,
  VIS: 1.5,
}

export function calculateCompatibility(scoresA, scoresB) {
  const axes = Object.keys(AXES)
  const axisResults = {}
  const aligned = []
  const divergent = []
  const tension = []
  let weightedSum = 0
  let totalWeight = 0

  for (const axis of axes) {
    const a = scoresA[axis] ?? 5
    const b = scoresB[axis] ?? 5
    const diff = Math.abs(a - b)
    const weight = AXIS_WEIGHTS[axis] ?? 1.0
    weightedSum += diff * weight
    totalWeight += weight

    let status
    if (diff <= 1.5) {
      status = 'aligned'
      aligned.push(axis)
    } else if (diff <= 3.5) {
      status = 'divergent'
      divergent.push(axis)
    } else {
      status = 'tension'
      tension.push(axis)
    }

    axisResults[axis] = { a, b, diff, status }
  }

  // High-stakes conflict detection
  const conflicts = []

  const visDiff = Math.abs((scoresA.VIS ?? 5) - (scoresB.VIS ?? 5))
  const budDiff = Math.abs((scoresA.BUD ?? 5) - (scoresB.BUD ?? 5))
  const visBudAvgA = ((scoresA.VIS ?? 5) + (11 - (scoresA.BUD ?? 5))) / 2
  const visBudAvgB = ((scoresB.VIS ?? 5) + (11 - (scoresB.BUD ?? 5))) / 2
  if (Math.abs(visBudAvgA - visBudAvgB) >= 3) {
    conflicts.push({
      id: 'vis_bud',
      label: 'Vision vs. Budget',
      description: 'One of you is driven by a strong vision; the other prioritizes financial caution. This tension often shows up in big decisions.',
    })
  }

  const custDiff = Math.abs((scoresA.CUST ?? 5) - (scoresB.CUST ?? 5))
  const convDiff = Math.abs((scoresA.CONV ?? 5) - (scoresB.CONV ?? 5))
  if (custDiff >= 3 && convDiff >= 3) {
    conflicts.push({
      id: 'cust_conv',
      label: 'Customization vs. Convenience',
      description: 'One of you wants to design every detail; the other wants an efficient, stress-free process. Planning meetings may feel like a negotiation.',
    })
  }

  const intDiff = Math.abs((scoresA.INT ?? 5) - (scoresB.INT ?? 5))
  if (intDiff >= 4) {
    conflicts.push({
      id: 'guest_count',
      label: 'Guest List Size',
      description: 'You have meaningfully different instincts about how many people to invite. This one comes up early and affects almost every other decision.',
    })
  }

  const sclDiff = Math.abs((scoresA.SCL ?? 5) - (scoresB.SCL ?? 5))
  if (sclDiff >= 4) {
    conflicts.push({
      id: 'energy',
      label: 'Celebration Energy',
      description: 'One of you is dreaming of a big, energetic party; the other wants something quieter and more intimate. The reception format is worth an early conversation.',
    })
  }

  const weightedAvgDiff = totalWeight > 0 ? weightedSum / totalWeight : 0
  const compatibilityScore = Math.round(Math.max(0, 100 - (weightedAvgDiff / 9) * 100))

  return {
    axisResults,
    aligned,
    divergent,
    tension,
    conflicts,
    compatibilityScore,
  }
}

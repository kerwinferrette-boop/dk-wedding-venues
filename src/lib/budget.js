// Budget math module - centralized quote calculations.
//
// Source: La Valencia Hotel quote (Winter Special, Saturday Select Package).
// Live data: pulled from Supabase tables `quote_line_items` and `project_metadata`.
//
// Algorithm (verified to match the actual quote exactly):
//   1. Process line items in display_order.
//   2. Each line either: contributes a flat amount, a per-person amount * a count,
//      or a percentage of the running subtotal AT THAT POSITION (e.g. service
//      charge applies to subtotal; tax applies to subtotal + service charge).
//   3. `scales_with` decides which count multiplies a per-person amount:
//      'guest_count' | 'vendor_count' | 'none' | 'subtotal'.
//
// Verified totals for the seed data (at 150 guests, 6 vendors):
//   subtotal        $37,600.00
//   + service 26%   $47,376.00
//   + tax 7.75%     $51,047.64

import { supabase } from './supabase'

export async function fetchQuote() {
  const { data, error } = await supabase
    .from('quote_line_items')
    .select('*')
    .order('display_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function fetchProjectMetadata() {
  const { data, error } = await supabase
    .from('project_metadata')
    .select('*')
    .eq('id', 1)
    .single()
  if (error) throw error
  return data
}

/**
 * Extras / second budget: purchases that sit OUTSIDE the core $58k La Valencia
 * budget (DJ, violinist, MUA, florist, painter, Reel Love film, 2nd shooter).
 * Each row carries a total cost plus an optional parents' contribution, so the
 * couple's out-of-pocket portion = total - (parents_covering ? parents_amount : 0).
 * Source of truth: Supabase table `extras_budget`.
 */
export async function fetchExtras() {
  const { data, error } = await supabase
    .from('extras_budget')
    .select('*')
    .order('display_order', { ascending: true })
  if (error) throw error
  return data || []
}

/**
 * Roll the extras rows up into the summary numbers the cards show.
 * @param {Array} rows - rows from extras_budget.
 * @returns {{ total: number, parents: number, couple: number, tbdCount: number, rows: Array }}
 *   total   : sum of every row's total cost
 *   parents : sum of the parents' contribution where parents_covering is on
 *   couple  : the couple's out-of-pocket portion (total - parents)
 *   tbdCount: how many rows still have pricing TBD
 */
export function computeExtras(rows = []) {
  let total = 0
  let parents = 0
  let tbdCount = 0
  for (const r of rows) {
    const rowTotal = Number(r.total_cost) || 0
    const rowParents = r.parents_covering ? (Number(r.parents_amount) || 0) : 0
    total += rowTotal
    parents += rowParents
    if (r.tbd) tbdCount += 1
  }
  return { total, parents, couple: Math.max(0, total - parents), tbdCount, rows }
}

/**
 * Compute the full budget breakdown for a given guest count.
 * @param {Array} quoteLines - rows from quote_line_items, sorted by display_order.
 * @param {number} guestCount - the headcount to compute against.
 * @param {object} opts - { vendorCount }.
 * @returns {{ lines: Array, subtotal: number, total: number }}
 *   `lines` is an array of resolved line items with `amount` filled in and a
 *   `runningTotal` after this line. `subtotal` is the running total BEFORE the
 *   first percentage line (service charge). `total` is the final running total.
 */
export function computeBudget(quoteLines, guestCount, opts = {}) {
  const vendorCount = opts.vendorCount ?? 6
  const lines = []
  let runningTotal = 0
  let subtotal = null

  for (const line of quoteLines) {
    let amount = 0

    if (line.applies_to_subtotal && line.rate != null) {
      // Percentage line - applies to running total at its position.
      // (Despite the column name `applies_to_subtotal`, this is intentional:
      //  service charge applies to subtotal; tax then applies to subtotal +
      //  service charge. The running total reflects this.)
      if (subtotal == null) subtotal = runningTotal
      amount = runningTotal * Number(line.rate)
    } else if (line.scales_with === 'guest_count' && line.per_person_amount != null) {
      amount = Number(line.per_person_amount) * guestCount
    } else if (line.scales_with === 'vendor_count' && line.per_person_amount != null) {
      amount = Number(line.per_person_amount) * vendorCount
    } else if (line.flat_amount != null) {
      amount = Number(line.flat_amount)
    } else if (line.per_person_amount != null && line.baseline_count != null) {
      // Fallback for lines with a fixed baseline (e.g. fixed-headcount items).
      amount = Number(line.per_person_amount) * Number(line.baseline_count)
    }

    runningTotal += amount
    lines.push({ ...line, amount, runningTotal })
  }

  if (subtotal == null) subtotal = runningTotal

  return { lines, subtotal, total: runningTotal }
}

/**
 * Compute the cost of adding one more guest at the current rate structure.
 * Done by diffing total(N) vs total(N+1) so service charge and tax compound
 * correctly.
 */
export function computeMarginalCostPerGuest(quoteLines, baseGuestCount = 150, opts = {}) {
  const at = computeBudget(quoteLines, baseGuestCount, opts).total
  const atPlusOne = computeBudget(quoteLines, baseGuestCount + 1, opts).total
  return atPlusOne - at
}

/**
 * Collapse the vendor pipeline into one representative cost per vendor type,
 * so multiple quotes/options for the same category (e.g. three cake bakers)
 * don't all stack into the budget. For each type we pick:
 *   - the booked vendor's cost if one is booked, else
 *   - the highest estimate among the remaining (non-passed) options.
 * The chosen row's `id` and parent-contribution fields (parent_contribution,
 * parent_contribution_amount, parent_contribution_side) pass through so the UI
 * can edit/save them directly, same as the Extras budget. Contribution reduces
 * the couple's out-of-pocket but NOT `total` (total = what's owed to vendors,
 * regardless of who pays it - stays consistent with the page's grand total).
 * @param {Array} vendors - rows from vendor_pipeline.
 * @param {object} opts - { exclude: string[] } vendor_types to skip entirely.
 * @returns {{ rows: Array, total: number, parents: number, couple: number }}
 */
export function computeVendorCommitments(vendors, opts = {}) {
  const exclude = opts.exclude ?? []
  const groups = {}
  for (const v of vendors) {
    if (exclude.includes(v.vendor_type)) continue
    if (v.status === 'passed') continue
    const cost = v.actual_cost || v.estimated_cost || 0
    ;(groups[v.vendor_type] ||= []).push({ ...v, _cost: cost })
  }

  const rows = Object.entries(groups).map(([vendor_type, options]) => {
    const booked = options.filter(o => o.status === 'booked')
    const pool = booked.length ? booked : options
    const chosen = pool.reduce((best, o) => (o._cost > best._cost ? o : best), pool[0])
    const parentAmount = chosen.parent_contribution ? (Number(chosen.parent_contribution_amount) || 0) : 0
    return {
      id: chosen.id,
      vendor_type,
      cost: chosen._cost,
      vendor_name: chosen.vendor_name,
      status: chosen.status,
      optionCount: options.length,
      isBooked: booked.length > 0,
      parent_contribution: !!chosen.parent_contribution,
      parent_contribution_amount: chosen.parent_contribution_amount,
      parent_contribution_side: chosen.parent_contribution_side,
      couple: Math.max(0, chosen._cost - parentAmount),
    }
  })
  rows.sort((a, b) => b.cost - a.cost)

  const total = rows.reduce((s, r) => s + r.cost, 0)
  const parents = rows.reduce((s, r) => s + (r.cost - r.couple), 0)
  return { rows, total, parents, couple: total - parents }
}

/**
 * Roll extras_budget rows + the "chosen" vendor_pipeline rows (from
 * computeVendorCommitments) into a single who's-paying-for-what breakdown,
 * bucketed by contribution side. Used to drive the payer-colored bar on the
 * Dashboard so parent contributions logged on either the Extras or Vendor
 * commitments tables show up in one place.
 * @param {Array} extraRows - rows from extras_budget (parents_covering, parents_amount, parents_side).
 * @param {Array} vendorRows - `.rows` from computeVendorCommitments (parent_contribution, parent_contribution_amount, parent_contribution_side).
 * @returns {{ dani: number, kerwin: number, both: number, couple: number, total: number }}
 */
export function computeContributionBreakdown(extraRows = [], vendorRows = []) {
  const totals = { dani: 0, kerwin: 0, both: 0, couple: 0, total: 0 }

  function apply(cost, isCovered, amount, side) {
    totals.total += cost
    const contrib = isCovered ? Math.min(cost, Number(amount) || 0) : 0
    if (contrib > 0) {
      const key = side === 'dani' || side === 'kerwin' ? side : 'both'
      totals[key] += contrib
    }
    totals.couple += Math.max(0, cost - contrib)
  }

  for (const r of extraRows) {
    apply(Number(r.total_cost) || 0, r.parents_covering, r.parents_amount, r.parents_side)
  }
  for (const r of vendorRows) {
    apply(r.cost || 0, r.parent_contribution, r.parent_contribution_amount, r.parent_contribution_side)
  }

  return totals
}

/**
 * Status traffic light for the headline total vs the target budget.
 * green  : at or under target
 * yellow : within 10% over target
 * red    : more than 10% over target
 */
export function budgetStatus(total, target) {
  if (target == null || target <= 0) return 'gray'
  if (total <= target) return 'green'
  if (total <= target * 1.1) return 'yellow'
  return 'red'
}

const usd0 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})
const usd2 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatUsd(n) {
  if (n == null || Number.isNaN(n)) return '-'
  return usd0.format(n)
}

export function formatUsdPrecise(n) {
  if (n == null || Number.isNaN(n)) return '-'
  return usd2.format(n)
}

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

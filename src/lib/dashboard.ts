import type { Data, Entry } from './domain'
import { installmentOutstanding, today } from './domain'
import { entryDetails, financialCategories, financialIndex, ledgerTotals, payableTotals } from './financial'
import { saleIsActive } from './sales-lifecycle'
export type CashScope = 'all' | 'land' | 'house' | 'company'
export type Period = { from: string; to: string }
export type QuickPeriod = 'today' | 'week' | 'month' | 'year'
export const scopeLabels = { all: 'Geral consolidado', land: 'Caixa de terrenos', house: 'Caixa de casas / obras', company: 'Sem vínculo com imóvel' }
const date = (value: string) => new Date(`${value}T12:00:00Z`)
const iso = (value: Date) => value.toISOString().slice(0, 10)
export function shiftDays(value: string, count: number) { const result = date(value); result.setUTCDate(result.getUTCDate() + count); return iso(result) }
export function validPeriod(period: Period) {
  const valid = (value: string) => Number(value.slice(0, 4)) >= 1900 && Number(value.slice(0, 4)) <= 2100 && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(date(value).getTime()) && iso(date(value)) === value
  return valid(period.from) && valid(period.to) && period.from <= period.to && (date(period.to).getTime() - date(period.from).getTime()) / 86400000 < 3660
}
export function quickPeriod(kind: QuickPeriod, reference = today()): Period {
  let from = reference
  if (kind === 'week') from = shiftDays(reference, -((date(reference).getUTCDay() + 6) % 7))
  if (kind === 'month') from = reference.slice(0, 7) + '-01'
  if (kind === 'year') from = reference.slice(0, 4) + '-01-01'
  return { from, to: reference }
}
export function previousPeriod(period: Period): Period {
  if (!validPeriod(period)) throw new Error('Selecione um período válido de até dez anos.')
  const days = Math.round((date(period.to).getTime() - date(period.from).getTime()) / 86400000) + 1
  return { from: shiftDays(period.from, -days), to: shiftDays(period.from, -1) }
}
export function percentageChange(current: number, previous: number): number | null { return previous === 0 ? null : (current - previous) / Math.abs(previous) * 100 }
export function cashPosition(data: Data, scope: CashScope, to = today()) {
  const index = financialIndex(data)
  const opening = data.accounts.filter(account => (!account.opening_on || account.opening_on <= to) && (scope === 'all' || (account.segment === 'general' || !account.segment ? 'company' : account.segment) === scope)).reduce((sum, account) => sum + account.opening_cents, 0)
  return opening + data.ledger.filter(entry => entry.occurred_on <= to && (scope === 'all' || entryDetails(entry, index).segment === scope)).reduce((sum, entry) => sum + entry.amount_cents, 0)
}
export type CashBucket = Period & { label: string; income: number; outcome: number; result: number }
export function cashBuckets(entries: Entry[], period: Period): CashBucket[] {
  if (!validPeriod(period)) return []
  const days = Math.round((date(period.to).getTime() - date(period.from).getTime()) / 86400000) + 1
  const result: CashBucket[] = []
  let from = period.from
  if (days <= 62) {
    const stride = Math.ceil(days / 12)
    while (from <= period.to) {
      const to = shiftDays(from, stride - 1) < period.to ? shiftDays(from, stride - 1) : period.to
      result.push({ from, to, label: date(from).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' }).replace('.', ''), income: 0, outcome: 0, result: 0 })
      from = shiftDays(to, 1)
    }
  } else {
    const start = date(period.from); const end = date(period.to)
    const months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth() + 1
    const stride = Math.ceil(months / 12)
    while (from <= period.to) {
      const next = date(from); next.setUTCDate(1); next.setUTCMonth(next.getUTCMonth() + stride)
      const to = shiftDays(iso(next), -1) < period.to ? shiftDays(iso(next), -1) : period.to
      result.push({ from, to, label: date(from).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' }).replace('.', ''), income: 0, outcome: 0, result: 0 })
      from = shiftDays(to, 1)
    }
  }
  for (const entry of entries) {
    const bucket = result.find(item => entry.occurred_on >= item.from && entry.occurred_on <= item.to)
    if (bucket) { bucket.income += Math.max(entry.amount_cents, 0); bucket.outcome += Math.max(-entry.amount_cents, 0); bucket.result += entry.amount_cents }
  }
  return result
}
export function executiveSummary(data: Data, period: Period, scope: CashScope = 'all', alertDays = 5, reference = today()) {
  if (!validPeriod(period)) throw new Error('Informe datas válidas, em ordem, em um intervalo de até dez anos.')
  const index = financialIndex(data)
  const inPeriod = (value: string) => value >= period.from && value <= period.to
  const inScope = (entry: Entry) => scope === 'all' || entryDetails(entry, index).segment === scope
  const entries = data.ledger.filter(entry => inScope(entry) && inPeriod(entry.occurred_on)).sort((a, b) => b.occurred_on.localeCompare(a.occurred_on) || (b.created_at || '').localeCompare(a.created_at || '') || b.id.localeCompare(a.id))
  const previous = previousPeriod(period)
  const previousTotal = ledgerTotals(data.ledger.filter(entry => inScope(entry) && entry.occurred_on >= previous.from && entry.occurred_on <= previous.to))
  const total = ledgerTotals(entries)
  const matchesProperty = (id: string | null) => scope === 'all' || (id ? index.properties.get(id)?.kind : 'company') === scope
  const installments = data.installments.filter(item => matchesProperty(index.sales.get(item.sale_id)?.property_id || null) && installmentOutstanding(item) > 0)
  const expenses = data.expenses.filter(item => matchesProperty(item.property_id))
  const overdue = installments.filter(item => item.due_on < reference)
  const upcoming = installments.filter(item => item.due_on >= reference && item.due_on <= shiftDays(reference, alertDays))
  const yearEnd = period.to < reference ? period.to : reference
  const yearReceived = data.ledger.filter(entry => inScope(entry) && entry.occurred_on >= period.to.slice(0, 4) + '-01-01' && entry.occurred_on <= yearEnd && ['sale', 'other_income'].includes(entry.category)).reduce((sum, entry) => sum + entry.amount_cents, 0)
  const byCategory = new Map<string, number>()
  for (const entry of entries.filter(entry => entry.amount_cents < 0)) {
    const details = entryDetails(entry, index)
    const label = entry.reversal_of && !entry.expense_id ? 'Estornos de recebimentos' : financialCategories[details.category] || details.category
    byCategory.set(label, (byCategory.get(label) || 0) - entry.amount_cents)
  }
  const costs = new Map(data.properties.map(property => [property.id, property.acquisition_cents]))
  for (const expense of data.expenses) if (expense.property_id && !['acquisition', 'refund'].includes(expense.category)) costs.set(expense.property_id, (costs.get(expense.property_id) || 0) + expense.amount_cents)
  function sector(kind: 'land' | 'house') {
    const properties = data.properties.filter(item => item.kind === kind)
    const ids = new Set(properties.map(item => item.id))
    const sales = data.sales.filter(sale => ids.has(sale.property_id) && saleIsActive(sale) && inPeriod(sale.sold_on))
    const received = entries.filter(entry => ids.has(entry.property_id || '') && entry.category === 'sale').reduce((sum, entry) => sum + entry.amount_cents, 0)
    const outstanding = installments.filter(item => ids.has(index.sales.get(item.sale_id)?.property_id || '')).reduce((sum, item) => sum + installmentOutstanding(item), 0)
    const incurred = data.expenses.filter(item => ids.has(item.property_id || '') && !['acquisition', 'refund'].includes(item.category) && item.purchased_on && inPeriod(item.purchased_on)).reduce((sum, item) => sum + item.amount_cents, 0)
    return { properties, total: properties.length, available: properties.filter(item => item.commercial_status === 'available').length, reserved: properties.filter(item => item.commercial_status === 'reserved').length, sold: properties.filter(item => item.commercial_status === 'sold').length,
      building: properties.filter(item => item.construction_status !== 'completed').length, completed: properties.filter(item => item.construction_status === 'completed').length,
      contracted: sales.reduce((sum, sale) => sum + sale.total_cents, 0), received, outstanding, incurred,
      cost: properties.reduce((sum, property) => sum + (costs.get(property.id) || 0), 0) }
  }
  return { period, previous, total, previousTotal, cash: cashPosition(data, scope, period.to), entries, buckets: cashBuckets(entries, period), distribution: [...byCategory].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    receivable: installments.reduce((sum, item) => sum + installmentOutstanding(item), 0), receivablePeriod: installments.filter(item => inPeriod(item.due_on)).reduce((sum, item) => sum + installmentOutstanding(item), 0), payable: payableTotals(expenses, reference), payablePeriod: payableTotals(expenses.filter(item => inPeriod(item.due_on)), reference), overdue, overduePeriod: overdue.filter(item => inPeriod(item.due_on)).length, upcoming, yearReceived,
    priorities: [...overdue, ...upcoming.filter(item => item.due_on === reference)].sort((a, b) => a.due_on.localeCompare(b.due_on)).slice(0, 5), lands: sector('land'), houses: sector('house'),
    undatedCosts: data.expenses.filter(item => !item.purchased_on && !['acquisition', 'refund'].includes(item.category) && matchesProperty(item.property_id)).length,
    legacyOpening: data.accounts.some(account => account.opening_cents !== 0 && !account.opening_on) }
}

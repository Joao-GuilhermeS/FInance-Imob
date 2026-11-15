import type { Data, Entry, Expense } from './domain'
import { today } from './domain'

export const financialCategories: Record<string, string> = {
  sale: 'Recebimento de venda', materials: 'Materiais', labor: 'Mão de obra',
  services: 'Serviços', acquisition: 'Aquisição', other: 'Outras despesas', expense: 'Despesa',
}
export type LedgerFilters = {
  from: string; to: string; account: string; contact: string; property: string;
  segment: string; category: string; operation: string; search: string;
}
export const defaultLedgerFilters = (): LedgerFilters => ({
  from: today().slice(0, 7) + '-01', to: today(), account: '', contact: '', property: '',
  segment: '', category: '', operation: '', search: '',
})
export function financialIndex(data: Data) {
  const contacts = new Map(data.contacts.map(item => [item.id, item]))
  const properties = new Map(data.properties.map(item => [item.id, item]))
  const accounts = new Map(data.accounts.map(item => [item.id, item]))
  const sales = new Map(data.sales.map(item => [item.id, item]))
  const installments = new Map(data.installments.map(item => [item.id, item]))
  const expenses = new Map(data.expenses.map(item => [item.id, item]))
  const reversedIds = new Set(data.ledger.flatMap(item => item.reversal_of ? [item.reversal_of] : []))
  return { contacts, properties, accounts, sales, installments, expenses, reversedIds }
}
export function entryDetails(entry: Entry, index: ReturnType<typeof financialIndex>) {
  const installment = entry.installment_id ? index.installments.get(entry.installment_id) : undefined
  const sale = installment ? index.sales.get(installment.sale_id) : undefined
  const expense = entry.expense_id ? index.expenses.get(entry.expense_id) : undefined
  const contactId = sale?.contact_id || expense?.contact_id || null
  const propertyId = entry.property_id || sale?.property_id || expense?.property_id || null
  const category = expense?.category || (installment ? 'sale' : entry.category)
  return {
    installment, expense, contactId, propertyId, category,
    contact: contactId ? index.contacts.get(contactId) : undefined,
    property: propertyId ? index.properties.get(propertyId) : undefined,
    account: index.accounts.get(entry.account_id),
    reversed: index.reversedIds.has(entry.id),
  }
}
export function filterLedger(data: Data, filters: LedgerFilters) {
  const index = financialIndex(data)
  const search = filters.search.trim().toLocaleLowerCase('pt-BR')
  return data.ledger.filter(entry => {
    const detail = entryDetails(entry, index)
    if (filters.from && entry.occurred_on < filters.from || filters.to && entry.occurred_on > filters.to) return false
    if (filters.account && entry.account_id !== filters.account) return false
    if (filters.contact && detail.contactId !== filters.contact) return false
    if (filters.property && detail.propertyId !== filters.property) return false
    if (filters.category && detail.category !== filters.category) return false
    if (filters.segment === 'company' && detail.propertyId !== null) return false
    if (filters.segment && filters.segment !== 'company' && detail.property?.kind !== filters.segment) return false
    if (filters.operation === 'in' && entry.amount_cents <= 0 || filters.operation === 'out' && entry.amount_cents >= 0) return false
    if (filters.operation === 'reversal' && !entry.reversal_of) return false
    return !search || [entry.description, entry.method, detail.contact?.name, detail.property?.code, detail.property?.name, detail.account?.name]
      .filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(search)
  }).sort((a, b) => b.occurred_on.localeCompare(a.occurred_on) || b.id.localeCompare(a.id))
}
export function ledgerTotals(entries: Entry[]) {
  return entries.reduce((sum, entry) => ({
    income: sum.income + Math.max(entry.amount_cents, 0),
    outcome: sum.outcome + Math.max(-entry.amount_cents, 0),
    result: sum.result + entry.amount_cents,
  }), { income: 0, outcome: 0, result: 0 })
}
export function payableTotals(expenses: Expense[], reference = today()) {
  return expenses.reduce((sum, expense) => {
    const pending = Math.max(expense.amount_cents - expense.paid_cents, 0)
    return { pending: sum.pending + pending, overdue: sum.overdue + (expense.due_on < reference ? pending : 0), count: sum.count + (pending > 0 ? 1 : 0) }
  }, { pending: 0, overdue: 0, count: 0 })
}
export function financialRecord(data: Data, kind: 'client' | 'property', id: string, reference = today()) {
  const sales = data.sales.filter(sale => kind === 'client' ? sale.contact_id === id : sale.property_id === id)
  const saleIds = new Set(sales.map(sale => sale.id))
  const installments = data.installments.filter(item => saleIds.has(item.sale_id))
    .sort((a, b) => a.due_on.localeCompare(b.due_on) || a.number - b.number)
  const installmentIds = new Set(installments.map(item => item.id))
  const ledger = data.ledger.filter(entry => kind === 'property' ? entry.property_id === id : entry.installment_id !== null && installmentIds.has(entry.installment_id))
    .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on) || b.id.localeCompare(a.id))
  const expenses = kind === 'property' ? data.expenses.filter(expense => expense.property_id === id) : []
  const property = kind === 'property' ? data.properties.find(item => item.id === id) : undefined
  const contracted = sales.reduce((sum, sale) => sum + sale.total_cents, 0)
  const received = installments.reduce((sum, item) => sum + item.received_cents, 0)
  const outstanding = installments.reduce((sum, item) => sum + Math.max(item.amount_cents - item.received_cents, 0), 0)
  const overdue = installments.filter(item => item.due_on < reference).reduce((sum, item) => sum + Math.max(item.amount_cents - item.received_cents, 0), 0)
  const cost = (property?.acquisition_cents || 0) + expenses.reduce((sum, expense) => sum + expense.amount_cents, 0)
  return { sales, installments, ledger, expenses, property, contracted, received, outstanding, overdue, cost,
    forecast: sales.length ? contracted - cost : null,
    cash: ledgerTotals(ledger).result, payable: payableTotals(expenses, reference) }
}
export function csv(rows: (string | number)[][]) {
  return '\ufeff' + rows.map(row => row.map(value => {
    const text = String(value)
    const safe = typeof value === 'string' && /^[\s]*[=+\-@]/.test(text) && !/^-?\d+(?:[.,]\d+)?$/.test(text) ? "'" + text : text
    return '"' + safe.replace(/"/g, '""') + '"'
  }).join(';')).join('\r\n')
}
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const url = URL.createObjectURL(new Blob([csv(rows)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url; link.download = filename; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

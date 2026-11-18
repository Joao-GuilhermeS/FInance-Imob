import { cents, today } from './domain'
import type { Data, Expense } from './domain'
import { FieldErrors } from './form-errors'
export const purchaseCategories: Record<string, string> = { materials: 'Materiais', labor: 'Mão de obra', services: 'Serviços', other: 'Outras despesas' }
export type PurchaseFilters = { from: string; to: string; date: 'purchase' | 'due' | 'undated'; property: string; contact: string; category: string; status: string; search: string }
export const emptyPurchaseFilters = (): PurchaseFilters => ({ from: '', to: '', date: 'purchase', property: '', contact: '', category: '', status: '', search: '' })
const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
export function filterPurchases(data: Data, filters: PurchaseFilters, reference = today()) {
  const contacts = new Map(data.contacts.map(item => [item.id, item.name]))
  const properties = new Map(data.properties.map(item => [item.id, `${item.code} ${item.name}`]))
  const search = normalized(filters.search.trim())
  return data.expenses.filter(item => {
    if (item.category === 'refund' || filters.date !== 'undated' && filters.from && filters.to && filters.from > filters.to) return false
    const date = filters.date === 'due' ? item.due_on : item.purchased_on
    if (filters.date === 'undated') { if (item.purchased_on) return false }
    else if ((filters.from || filters.to) && (!date || filters.from && date < filters.from || filters.to && date > filters.to)) return false
    if (filters.property === 'company' ? item.property_id !== null : filters.property && item.property_id !== filters.property) return false
    if (filters.contact && item.contact_id !== filters.contact || filters.category && item.category !== filters.category) return false
    const pending = Math.max(item.amount_cents - item.paid_cents, 0)
    if (filters.status === 'paid' && pending > 0 || filters.status === 'pending' && pending === 0 || filters.status === 'partial' && !(pending > 0 && item.paid_cents > 0) || filters.status === 'late' && !(pending > 0 && item.due_on < reference)) return false
    return !search || normalized([item.description, item.classification, item.notes, contacts.get(item.contact_id || ''), properties.get(item.property_id || ''), purchaseCategories[item.category]].filter(Boolean).join(' ')).includes(search)
  }).sort((a, b) => (filters.date === 'due' ? b.due_on.localeCompare(a.due_on) : (b.purchased_on || '').localeCompare(a.purchased_on || '')) || a.id.localeCompare(b.id))
}
export function purchaseTotals(items: Expense[], reference = today()) {
  return items.reduce((total, item) => {
    const pending = Math.max(item.amount_cents - item.paid_cents, 0)
    return { amount: total.amount + item.amount_cents, paid: total.paid + item.paid_cents, pending: total.pending + pending, overdue: total.overdue + (item.due_on < reference ? pending : 0) }
  }, { amount: 0, paid: 0, pending: 0, overdue: 0 })
}
export function purchaseValues(values: Record<string, string>, requireProperty = false) {
  const errors: Record<string, string> = {}
  const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date || '') && Number.isFinite(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date
  if (!validDate(values.purchased) || values.purchased > today()) errors.purchased = 'Informe a data da compra, até hoje.'
  if (!validDate(values.due)) errors.due = 'Informe um vencimento válido.'
  if ((values.description || '').trim().length < 2 || values.description.length > 2000) errors.description = 'Descreva o que foi comprado ou contratado (2 a 2.000 caracteres).'
  if (!(values.category in purchaseCategories)) errors.category = 'Selecione a categoria.'
  if (requireProperty && !values.property) errors.property = 'Selecione o imóvel ou obra.'
  let amount = 0
  try { amount = cents(values.amount || ''); if (amount <= 0) errors.amount = 'Informe um valor maior que zero.' } catch { errors.amount = 'Informe um valor com até duas casas decimais.' }
  const quantity = values.quantity?.trim() ? Number(values.quantity) : null
  if (quantity === null && (values.unit || '').trim()) errors.quantity = 'Informe a quantidade ou deixe a unidade em branco.'
  if (quantity !== null && (!/^\d+(\.\d{1,3})?$/.test(values.quantity) || quantity <= 0 || quantity >= 1e9)) errors.quantity = 'Use uma quantidade positiva com até três casas decimais.'
  if ((values.unit || '').trim().length > 30) errors.unit = 'Use até 30 caracteres.'
  if ((values.notes || '').length > 2000) errors.notes = 'Use até 2.000 caracteres.'
  if ((values.classification || '').trim().length > 80) errors.classification = 'Use até 80 caracteres.'
  if (Object.keys(errors).length) throw new FieldErrors(errors)
  return { p_property: values.property || null, p_contact: values.contact || null, p_description: values.description.trim(), p_category: values.category, p_amount: amount, p_purchased: values.purchased, p_due: values.due, p_notes: (values.notes || '').trim(), p_quantity: quantity, p_unit: (values.unit || '').trim() || (quantity !== null ? 'un' : ''), p_classification: (values.classification || '').trim() }
}

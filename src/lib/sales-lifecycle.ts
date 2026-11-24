import { cents, installmentOutstanding, today } from './domain'
import type { Data, Sale } from './domain'
import { FieldErrors } from './form-errors'
export const saleIsActive = (sale: Sale) => sale.status !== 'cancelled'
export const eventLabels: Record<string, string> = { reserve: 'Reserva registrada', release: 'Reserva liberada', convert: 'Reserva convertida em venda', renegotiate: 'Parcelas renegociadas', cancel: 'Venda cancelada', edit: 'Venda editada' }
export function saleBalances(data: Data, saleId: string) {
  const items = data.installments.filter(item => item.sale_id === saleId)
  return { received: items.reduce((sum, item) => sum + item.received_cents, 0), outstanding: items.reduce((sum, item) => sum + installmentOutstanding(item), 0) }
}
export function schedulePreview(total: number, count: number, first: string) {
  if (!Number.isSafeInteger(total) || total <= 0 || !Number.isInteger(count) || count < 1 || count > 600 || total < count || !/^\d{4}-\d{2}-\d{2}$/.test(first)) throw new Error('Confira a quantidade de parcelas e o primeiro vencimento.')
  const initial = new Date(`${first}T12:00:00Z`)
  if (!Number.isFinite(initial.getTime()) || initial.toISOString().slice(0, 10) !== first) throw new Error('Informe uma data válida.')
  const base = Math.floor(total / count)
  return Array.from({ length: count }, (_, index) => {
    const year = initial.getUTCFullYear(); const month = initial.getUTCMonth() + index
    const day = Math.min(initial.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate())
    const due = new Date(Date.UTC(year, month, day, 12)).toISOString().slice(0, 10)
    return { number: index + 1, amount: base + (index === count - 1 ? total - base * count : 0), due }
  })
}
export function renegotiationValues(values: Record<string, string>, balance: number) {
  const errors: Record<string, string> = {}
  const count = Number(values.count)
  const first = values.first || ''
  if (!Number.isInteger(count) || count < 1 || count > 600 || count > balance) errors.count = 'Informe de 1 a 600 parcelas, respeitando o saldo em centavos.'
  try { schedulePreview(balance, count, first) } catch { errors.first = 'Confira o primeiro vencimento e a quantidade de parcelas.' }
  if (first < today()) errors.first = 'O primeiro vencimento deve ser a partir de hoje.'
  if ((values.reason || '').trim().length < 5) errors.reason = 'Informe um motivo com pelo menos 5 caracteres.'
  if (Object.keys(errors).length) throw new FieldErrors(errors)
  return { count, first, reason: values.reason.trim() }
}
export function cancellationValues(values: Record<string, string>, received: number) {
  const errors: Record<string, string> = {}
  let refund = 0
  try { refund = cents(values.refund || ''); if (refund > received) errors.refund = 'A devolução não pode superar o valor recebido.' } catch { errors.refund = 'Informe o valor acordado de devolução, inclusive se for zero.' }
  if (!values.due || !/^\d{4}-\d{2}-\d{2}$/.test(values.due) || !Number.isFinite(Date.parse(`${values.due}T12:00:00Z`)) || new Date(`${values.due}T12:00:00Z`).toISOString().slice(0, 10) !== values.due) errors.due = 'Informe uma data válida para a devolução.'
  if ((values.reason || '').trim().length < 5) errors.reason = 'Descreva o acordo com pelo menos 5 caracteres.'
  if (values.confirm !== 'yes') errors.confirm = 'Confirme o valor acordado antes de cancelar a venda.'
  if (Object.keys(errors).length) throw new FieldErrors(errors)
  return { refund, due: values.due, reason: values.reason.trim() }
}

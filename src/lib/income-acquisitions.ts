import { cents, today } from './domain'
import { FieldErrors } from './form-errors'
export const paymentMethods = ['Pix', 'Transferência', 'Dinheiro', 'Boleto', 'Cartão', 'Outro'].map(value => ({ value, label: value }))
function validDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value }
export function incomeValues(values: Record<string, string>) {
  const errors: Record<string, string> = {}
  let amount = 0
  try { amount = cents(values.amount || ''); if (amount <= 0) errors.amount = 'Informe um valor maior que zero.' } catch { errors.amount = 'Informe um valor com até duas casas decimais.' }
  if (!validDate(values.date) || values.date > today()) errors.date = 'Informe a data do recebimento, até hoje.'
  if ((values.description || '').trim().length < 2 || (values.description || '').length > 2000) errors.description = 'Descreva a origem da receita (2 a 2.000 caracteres).'
  if (!values.account) errors.account = 'Selecione a conta que recebeu o valor.'
  if (!paymentMethods.some(method => method.value === values.method)) errors.method = 'Selecione a forma de pagamento.'
  if ((values.notes || '').length > 2000) errors.notes = 'Use até 2.000 caracteres.'
  if (Object.keys(errors).length) throw new FieldErrors(errors)
  return { p_account: values.account, p_amount: amount, p_date: values.date, p_description: values.description.trim(), p_method: values.method, p_property: values.property || null, p_contact: values.contact || null, p_notes: (values.notes || '').trim() }
}
export function acquisitionValues(values: Record<string, string>, cost: number) {
  const errors: Record<string, string> = {}
  let opening = 0
  try { opening = cents(values.opening || ''); if (opening > cost) errors.opening = 'O valor já pago não pode superar o custo de aquisição.' } catch { errors.opening = 'Informe explicitamente o valor já pago, inclusive se for zero.' }
  if (!Number.isSafeInteger(cost) || cost <= 0) errors.opening = 'O imóvel precisa de um custo de aquisição positivo.'
  if (!validDate(values.due)) errors.due = 'Informe um vencimento válido.'
  if ((values.reason || '').trim().length < 5 || (values.reason || '').length > 2000) errors.reason = 'Explique a situação inicial (5 a 2.000 caracteres).'
  if (values.confirm !== 'yes') errors.confirm = 'Confirme que o saldo inicial do caixa já considera os pagamentos anteriores.'
  if (Object.keys(errors).length) throw new FieldErrors(errors)
  return { p_opening_paid: opening, p_due: values.due, p_contact: values.contact || null, p_reason: values.reason.trim() }
}

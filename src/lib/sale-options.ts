import { cents } from './domain'
import { FieldErrors } from './form-errors'
export const salePeriods: Record<string, string> = { weekly: 'Semanal (7 dias)', fortnightly: 'A cada 14 dias', monthly: 'Mensal', quarterly: 'Trimestral', yearly: 'Anual' }
export function saleOptions(values: Record<string, string>) {
  const errors: Record<string, string> = {}
  const parse = (key: string) => { try { return cents(values[key] || '0') } catch { errors[key] = 'Informe um valor válido em reais, com até duas casas decimais.'; return 0 } }
  const base = parse('total'), interest = parse('interest'), discount = parse('discount'), down = parse('down')
  const total = base + interest - discount, count = Number(values.count), notes = (values.notes || '').trim()
  if (base <= 0) errors.total = 'O valor base deve ser maior que zero.'
  if (total <= 0 || total > 1e12) errors.total = 'Confira o total final do contrato.'
  if (down < 0 || down > total) errors.down = 'A entrada deve estar entre zero e o total final.'
  if (!Number.isInteger(count) || count < 1 || count > 600 || total > down && total - down < count) errors.count = 'Informe de 1 a 600 parcelas, sem parcelas menores que um centavo.'
  if (!salePeriods[values.period]) errors.period = 'Selecione a periodicidade.'
  if ((interest > 0 || discount > 0) && notes.length < 5) errors.notes = 'Descreva os ajustes acordados (mínimo 5 caracteres).'
  const validDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v || '') && Number.isFinite(Date.parse(`${v}T12:00:00Z`)) && new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) === v
  if (!validDate(values.sold)) errors.sold = 'Informe uma data válida.'
  if (!validDate(values.first) || values.first < values.sold) errors.first = 'O primeiro vencimento deve ser na data da venda ou depois.'
  if (Object.keys(errors).length) throw new FieldErrors(errors)
  const remaining = total - down, unit = Math.floor(remaining / count)
  const first = new Date(`${values.first}T12:00:00Z`)
  const schedule = remaining > 0 ? Array.from({ length: count }, (_, i) => {
    const due = new Date(first)
    if (values.period === 'weekly' || values.period === 'fortnightly') due.setUTCDate(first.getUTCDate() + i * (values.period === 'weekly' ? 7 : 14))
    else {
      const month = first.getUTCMonth() + i * (values.period === 'quarterly' ? 3 : values.period === 'yearly' ? 12 : 1)
      due.setUTCDate(1); due.setUTCMonth(month)
      const last = new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth() + 1, 0)).getUTCDate()
      due.setUTCDate(Math.min(first.getUTCDate(), last))
    }
    return { amount: unit + (i === count - 1 ? remaining - unit * count : 0), due: due.toISOString().slice(0, 10) }
  }) : []
  return { base, interest, discount, total, down, count, notes, schedule }
}

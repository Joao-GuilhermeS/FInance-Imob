import { describe, expect, it } from 'vitest'
import type { Data, Entry } from './domain'
import { emptyData } from './domain'
import { cashBuckets, cashPosition, executiveSummary, percentageChange, previousPeriod, quickPeriod, validPeriod } from './dashboard'
const period = { from: '2026-11-01', to: '2026-11-18' }
function fixture(): Data {
  const entry = (id: string, amount: number, property: string | null, occurred: string, category = 'sale', expense: string | null = null): Entry => ({ id, amount_cents: amount, property_id: property, occurred_on: occurred, category, expense_id: expense, installment_id: null, account_id: 'general', description: id, method: 'Pix', reversal_of: null })
  return { ...emptyData,
    properties: [
      { id: 'land', code: 'L01', name: 'Lote', kind: 'land', address: '', acquisition_cents: 10000, asking_cents: 50000, budget_cents: 0, commercial_status: 'sold', construction_status: 'planning' },
      { id: 'house', code: 'C01', name: 'Casa', kind: 'house', address: '', acquisition_cents: 20000, asking_cents: 30000, budget_cents: 30000, commercial_status: 'available', construction_status: 'building' },
    ],
    accounts: [{ id: 'general', name: 'Geral', opening_cents: 10000 }, { id: 'future', name: 'Terrenos', opening_cents: 7000, segment: 'land', opening_on: '2026-12-01' }],
    sales: [{ id: 's1', property_id: 'land', contact_id: 'c', total_cents: 50000, sold_on: '2026-11-01', contacts: { name: 'Cliente' }, properties: { name: 'Lote', code: 'L01' } }, { id: 's2', property_id: 'house', contact_id: 'c', total_cents: 30000, sold_on: '2026-10-20', contacts: { name: 'Cliente' }, properties: { name: 'Casa', code: 'C01' } }],
    installments: [{ id: 'i1', sale_id: 's1', number: 1, amount_cents: 50000, received_cents: 30000, due_on: '2026-11-20', client_name: 'Cliente', property_code: 'L01' }, { id: 'i2', sale_id: 's2', number: 1, amount_cents: 30000, received_cents: 10000, due_on: '2026-12-01', client_name: 'Cliente', property_code: 'C01' }, { id: 'retired', sale_id: 's1', number: 0, amount_cents: 10000, received_cents: 0, due_on: '2026-10-01', status: 'renegotiated', client_name: 'Cliente', property_code: 'L01' }],
    expenses: [{ id: 'materials', property_id: 'house', contact_id: null, category: 'materials', description: 'Cimento', quantity: 1, unit: 'un', amount_cents: 5000, paid_cents: 0, due_on: '2026-11-25', purchased_on: '2026-11-01' }, { id: 'acquisition', property_id: 'land', contact_id: null, category: 'acquisition', description: 'Aquisição', quantity: 1, unit: 'imóvel', amount_cents: 10000, paid_cents: 5000, due_on: '2026-11-25', opening_paid_cents: 3000 }],
    ledger: [entry('previous', 20000, 'land', '2026-10-20'), entry('land-receipt', 30000, 'land', '2026-11-05'), entry('house-receipt', 10000, 'house', '2026-11-10'), entry('payment', -5000, 'house', '2026-11-11', 'expense', 'materials'), { ...entry('reversal', 5000, 'house', '2026-11-12', 'expense', 'materials'), reversal_of: 'payment' }, entry('other-income', 2000, null, '2026-11-09', 'other_income')],
  }
}
describe('períodos do dashboard', () => {
  it('calcula atalhos e comparação anterior com duração igual sem desvio de fuso', () => {
    expect(quickPeriod('week', '2026-11-22')).toEqual({ from: '2026-11-16', to: '2026-11-22' })
    expect(quickPeriod('month', '2024-02-29')).toEqual({ from: '2024-02-01', to: '2024-02-29' })
    expect(previousPeriod(period)).toEqual({ from: '2026-10-14', to: '2026-10-31' })
  })
  it('não aceita datas impossíveis, intervalos invertidos ou períodos enormes', () => {
    expect(validPeriod({ from: '2026-02-30', to: '2026-03-01' })).toBe(false)
    expect(validPeriod({ from: '2026-12-01', to: '2026-01-01' })).toBe(false)
    expect(validPeriod({ from: '1900-01-01', to: '2100-01-01' })).toBe(false)
    expect(validPeriod({ from: '9999-01-01', to: '9999-01-02' })).toBe(false)
    expect(() => executiveSummary(fixture(), { from: '', to: '' })).toThrow()
  })
  it('não inventa percentuais quando não há base anterior', () => {
    expect(percentageChange(100, 0)).toBeNull()
    expect(percentageChange(0, 0)).toBeNull()
    expect(percentageChange(150, 100)).toBe(50)
    expect(percentageChange(50, 100)).toBe(-50)
  })
})
describe('indicadores financeiros executivos', () => {
  it('considera estornos no caixa e reconcilia buckets ao extrato sem duplicações', () => {
    const summary = executiveSummary(fixture(), period, 'all', 5, '2026-11-18')
    expect(summary.total).toEqual({ income: 47000, outcome: 5000, result: 42000 })
    expect(summary.previousTotal.income).toBe(20000)
    expect(summary.buckets.reduce((sum, item) => sum + item.result, 0)).toBe(summary.total.result)
    expect(summary.distribution.reduce((sum, item) => sum + item.value, 0)).toBe(summary.total.outcome)
    expect(summary.yearReceived).toBe(62000)
  })
  it('consolida segmentos e mantém aberturas não atribuídas na empresa', () => {
    const data = fixture()
    expect(cashPosition(data, 'all', period.to)).toBe(72000)
    expect(cashPosition(data, 'land', period.to)).toBe(50000)
    expect(cashPosition(data, 'house', period.to)).toBe(10000)
    expect(cashPosition(data, 'company', period.to)).toBe(12000)
    expect(['land', 'house', 'company'].reduce((sum, scope) => sum + cashPosition(data, scope as 'land' | 'house' | 'company', period.to), 0)).toBe(cashPosition(data, 'all', period.to))
    expect(cashPosition(data, 'all', '2026-12-31')).toBe(79000)
  })
  it('preserva a carteira atual e distingue vencimentos selecionados, sem cobrar renegociadas', () => {
    const summary = executiveSummary(fixture(), period, 'all', 5, '2026-11-18')
    expect(summary.receivable).toBe(40000)
    expect(summary.receivablePeriod).toBe(0)
    expect(summary.upcoming.map(item => item.id)).toEqual(['i1'])
    expect(summary.overdue).toHaveLength(0)
    expect(summary.payable.pending).toBe(10000)
    expect(summary.payablePeriod.pending).toBe(0)
  })
  it('separa contratos vendidos no período e não duplica o custo da aquisição', () => {
    const summary = executiveSummary(fixture(), period, 'all', 5, '2026-11-18')
    expect(summary.lands.contracted).toBe(50000)
    expect(summary.houses.contracted).toBe(0)
    expect(summary.lands.cost).toBe(10000)
    expect(summary.houses.cost).toBe(25000)
    expect(summary.houses.incurred).toBe(5000)
    expect(summary.undatedCosts).toBe(0)
  })
  it('agrega mais de um ano em até 12 intervalos sem perder lançamentos nas bordas', () => {
    const data = fixture()
    const buckets = cashBuckets(data.ledger, { from: '2025-01-15', to: '2026-11-18' })
    expect(buckets.length).toBeLessThanOrEqual(12)
    expect(buckets[0].from).toBe('2025-01-15')
    expect(buckets.at(-1)?.to).toBe('2026-11-18')
    expect(buckets.reduce((sum, item) => sum + item.result, 0)).toBe(62000)
  })
})

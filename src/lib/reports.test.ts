import { describe, expect, it } from 'vitest'
import { emptyData } from './domain'
import type { Data } from './domain'
import { buildReport, initialReportFilters, statementReport } from './reports'

function fixture(): Data {
  return { ...emptyData,
    contacts: [{ id: 'supplier', name: '=Fornecedor', kind: 'supplier', document: '', email: '', phone: '', address: '' }],
    properties: [{ id: 'house', name: 'Casa', code: 'C01', kind: 'house', address: '', acquisition_cents: 10000, asking_cents: 50000, budget_cents: 0, commercial_status: 'available', construction_status: 'building' }],
    accounts: [{ id: 'bank', name: 'Banco', opening_cents: 999999, segment: 'general' }],
    expenses: [{ id: 'e', property_id: 'house', contact_id: 'supplier', description: 'Cimento', category: 'materials', amount_cents: 5000, paid_cents: 2000, purchased_on: '2026-11-01', due_on: '2026-12-01', quantity: 1, unit: 'registro' }, { id: 'old', property_id: 'house', contact_id: 'supplier', description: 'Legado', category: 'services', amount_cents: 1000, paid_cents: 0, due_on: '2026-11-05', quantity: 1, unit: 'registro' }],
    ledger: [{ id: 'pay', account_id: 'bank', property_id: 'house', contact_id: 'supplier', installment_id: null, expense_id: 'e', description: 'Pagamento', category: 'materials', amount_cents: -3000, occurred_on: '2026-11-02', method: 'Pix', reversal_of: null }, { id: 'reverse', account_id: 'bank', property_id: 'house', contact_id: 'supplier', installment_id: null, expense_id: 'e', description: 'Estorno', category: 'materials', amount_cents: 1000, occurred_on: '2026-11-03', method: 'Pix', reversal_of: 'pay' }],
  }
}
const filters = () => ({ ...initialReportFilters(), from: '2026-11-01', to: '2026-11-30' })
describe('relatórios financeiros', () => {
  it('preserva centavos numéricos e estornos sem somar saldos iniciais', () => {
    const report = statementReport(fixture(), filters())
    expect(report.rows.map(row => row[6]).sort()).toEqual([-3000, 1000])
    expect(report.notes.join(' ')).toContain('20,00')
  })
  it('reconcilia o fluxo agrupado com o extrato', () => {
    const r = buildReport(fixture(), 'monthly', filters())
    expect(r.rows.reduce((sum, row) => sum + Number(row[4]), 0)).toBe(-2000)
  })
  it('filtra compras pela compra e obrigações pelo vencimento', () => {
    expect(buildReport(fixture(), 'purchases', filters()).rows.map(row => row[2])).toEqual(['Cimento'])
    expect(buildReport(fixture(), 'payables', filters()).rows.map(row => row[2])).toEqual(['Legado'])
    expect(buildReport(fixture(), 'purchases', filters()).rows[0][8]).toBe(3000)
  })
  it('não inclui compras antigas sem data em categorias do mês', () => {
    expect(buildReport(fixture(), 'categories', filters()).rows).toEqual([['Materiais', 5000]])
  })
  it('isola segmento e fornecedor', () => {
    expect(buildReport(fixture(), 'suppliers', { ...filters(), contact: 'supplier' }).rows).toHaveLength(1)
    expect(buildReport(fixture(), 'suppliers', { ...filters(), segment: 'land' }).rows).toHaveLength(0)
    expect(buildReport(fixture(), 'suppliers', { ...filters(), contact: 'unknown' }).rows).toHaveLength(0)
  })
  it('não fabrica lucro sem contrato e conta aquisição uma vez', () => {
    const row = buildReport(fixture(), 'profitability', filters()).rows[0]
    expect(row[3]).toBe(16000); expect(row[6]).toBe('Sem venda ativa')
    expect(row[7]).toBe(-2000)
  })
  it('retorna fluxo vazio para intervalo inválido', () => {
    expect(buildReport(fixture(), 'monthly', { ...filters(), from: '2026-12-01' }).rows).toEqual([])
  })
})

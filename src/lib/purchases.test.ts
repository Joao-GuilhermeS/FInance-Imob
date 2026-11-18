import { describe, expect, it } from 'vitest'
import { emptyData } from './domain'
import type { Data, Expense } from './domain'
import { emptyPurchaseFilters, filterPurchases, purchaseTotals, purchaseValues } from './purchases'
const base: Expense = { id: 'cement', property_id: 'house', contact_id: 'supplier', category: 'materials', description: 'Compra de cimento', quantity: 10, unit: 'sacos', amount_cents: 10001, paid_cents: 4000, due_on: '2026-10-20', purchased_on: '2026-10-01', classification: 'Cimento', notes: 'Entrega com frete' }
function fixture(): Data { return { ...emptyData, contacts: [{ id: 'supplier', kind: 'supplier', name: 'Construção Norte', document: '', email: '', address: '', phone: '' }], properties: [{ id: 'house', code: 'C01', name: 'Casa Jardim', kind: 'house', acquisition_cents: 0, asking_cents: 0, budget_cents: 0, commercial_status: 'available', construction_status: 'planning', address: '' }], expenses: [base, { ...base, id: 'energy', property_id: null, contact_id: null, category: 'other', description: 'Energia do escritório', purchased_on: '2026-11-01', due_on: '2026-11-10', amount_cents: 2000, paid_cents: 2000 }, { ...base, id: 'legacy', purchased_on: null, amount_cents: 3000, paid_cents: 0 }, { ...base, id: 'refund', category: 'refund', refund_sale_id: 'cancelled-sale' }] } }
describe('consultas financeiras de compras', () => {
  it('combina filtros, ignora acentos e conserva total, pagamentos parciais e saldo', () => {
    const items = filterPurchases(fixture(), { ...emptyPurchaseFilters(), from: '2026-10-01', to: '2026-10-01', contact: 'supplier', property: 'house', category: 'materials', status: 'partial', search: 'construcao' }, '2026-11-01')
    expect(items.map(item => item.id)).toEqual(['cement'])
    expect(purchaseTotals(items, '2026-11-01')).toEqual({ amount: 10001, paid: 4000, pending: 6001, overdue: 6001 })
  })
  it('separa data da compra e vencimento sem inventar datas históricas', () => {
    expect(filterPurchases(fixture(), { ...emptyPurchaseFilters(), date: 'due', from: '2026-10-20', to: '2026-10-20' })).toHaveLength(2)
    expect(filterPurchases(fixture(), { ...emptyPurchaseFilters(), date: 'undated', from: '2030-01-01', to: '2020-01-01' }).map(item => item.id)).toEqual(['legacy'])
    expect(filterPurchases(fixture(), emptyPurchaseFilters())).toHaveLength(3)
  })
  it('filtra empresa, quitação e atraso e rejeita intervalos invertidos', () => {
    expect(filterPurchases(fixture(), { ...emptyPurchaseFilters(), property: 'company', status: 'paid' }).map(item => item.id)).toEqual(['energy'])
    expect(filterPurchases(fixture(), { ...emptyPurchaseFilters(), status: 'late' }, '2026-11-01')).toHaveLength(2)
    expect(filterPurchases(fixture(), { ...emptyPurchaseFilters(), from: '2026-12-01', to: '2026-10-01' })).toHaveLength(0)
    expect(filterPurchases(fixture(), { ...emptyPurchaseFilters(), search: 'inexistente' })).toHaveLength(0)
  })
})
const values = { description: 'Cimento e frete', amount: '100.01', category: 'materials', purchased: '2026-01-01', due: '2026-01-10', property: '', contact: '', quantity: '', unit: '', notes: '', classification: '' }
describe('registro rápido de compras', () => {
  it('exige só informações financeiras e mantém quantidade e fornecedor opcionais', () => {
    const result = purchaseValues(values)
    expect(result.p_amount).toBe(10001)
    expect(result.p_quantity).toBeNull()
    expect(result.p_property).toBeNull()
    expect(result.p_contact).toBeNull()
    expect(purchaseValues({ ...values, quantity: '10' }).p_unit).toBe('un')
    expect(() => purchaseValues({ ...values, unit: 'sacos' })).toThrow()
  })
  it('valida datas reais, valor positivo, precisão de quantidade e vínculo para Obras', () => {
    for (const patch of [{ amount: '0' }, { amount: '1.001' }, { purchased: '2026-02-30' }, { purchased: '2099-01-01' }, { due: '2026-02-30' }, { quantity: '1.0001' }, { quantity: '-1' }, { description: 'x' }, { category: 'refund' }]) expect(() => purchaseValues({ ...values, ...patch })).toThrow()
    expect(() => purchaseValues(values, true)).toThrow()
  })
})

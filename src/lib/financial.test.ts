import { describe, expect, it } from 'vitest'
import type { Data } from './domain'
import { csv, entryDetails, filterLedger, financialIndex, financialRecord, ledgerTotals, payableTotals } from './financial'

function fixture(): Data {
  return {
    contacts: [
      { id: 'buyer', name: 'Ana', kind: 'client', document: '', email: '', phone: '', address: '' },
      { id: 'other', name: 'Bruno', kind: 'client', document: '', email: '', phone: '', address: '' },
      { id: 'supplier', name: 'Materiais Norte', kind: 'supplier', document: '', email: '', phone: '', address: '' },
    ],
    properties: [
      { id: 'house', name: 'Casa 01', code: 'C01', kind: 'house', address: '', acquisition_cents: 30000, asking_cents: 100000, budget_cents: 50000, commercial_status: 'sold', construction_status: 'building' },
      { id: 'land', name: 'Lote 02', code: 'L02', kind: 'land', address: '', acquisition_cents: 10000, asking_cents: 50000, budget_cents: 0, commercial_status: 'sold', construction_status: 'planning' },
      { id: 'unsold', name: 'Lote sem venda', code: 'L03', kind: 'land', address: '', acquisition_cents: 10000, asking_cents: 50000, budget_cents: 0, commercial_status: 'available', construction_status: 'planning' },
    ],
    accounts: [{ id: 'bank', name: 'Banco', opening_cents: 50000 }, { id: 'cash', name: 'Caixa', opening_cents: 0 }],
    sales: [
      { id: 'sale-house', property_id: 'house', contact_id: 'buyer', total_cents: 100000, sold_on: '2026-10-01', contacts: { name: 'Ana' }, properties: { code: 'C01', name: 'Casa 01' } },
      { id: 'sale-land', property_id: 'land', contact_id: 'other', total_cents: 50000, sold_on: '2026-10-01', contacts: { name: 'Bruno' }, properties: { code: 'L02', name: 'Lote 02' } },
    ],
    installments: [
      { id: 'i1', sale_id: 'sale-house', number: 0, amount_cents: 20000, due_on: '2026-10-01', received_cents: 10000, client_name: 'Ana', property_code: 'C01' },
      { id: 'i2', sale_id: 'sale-house', number: 1, amount_cents: 80000, due_on: '2026-12-01', received_cents: 0, client_name: 'Ana', property_code: 'C01' },
      { id: 'i3', sale_id: 'sale-land', number: 1, amount_cents: 50000, due_on: '2026-10-01', received_cents: 50000, client_name: 'Bruno', property_code: 'L02' },
    ],
    expenses: [
      { id: 'material', property_id: 'house', contact_id: 'supplier', category: 'materials', description: 'Cimento', quantity: 10, unit: 'saco', amount_cents: 20000, paid_cents: 5000, due_on: '2026-11-01' },
      { id: 'service', property_id: 'house', contact_id: null, category: 'services', description: 'Instalação', quantity: 1, unit: 'un', amount_cents: 10000, paid_cents: 0, due_on: '2026-12-01' },
      { id: 'general', property_id: null, contact_id: 'supplier', category: 'other', description: 'Escritório', quantity: 1, unit: 'un', amount_cents: 3000, paid_cents: 3000, due_on: '2026-11-02' },
    ],
    ledger: [
      { id: 'receive', account_id: 'bank', property_id: 'house', installment_id: 'i1', expense_id: null, amount_cents: 10000, occurred_on: '2026-11-01', category: 'sale', description: 'Parcela da casa', method: 'Pix', reversal_of: null },
      { id: 'receive-2', account_id: 'bank', property_id: 'house', installment_id: 'i1', expense_id: null, amount_cents: 10000, occurred_on: '2026-11-01', category: 'sale', description: 'Complemento da parcela', method: 'Pix', reversal_of: null },
      { id: 'reverse', account_id: 'bank', property_id: 'house', installment_id: 'i1', expense_id: null, amount_cents: -10000, occurred_on: '2026-11-02', category: 'sale', description: 'Estorno do recebimento', method: 'Pix', reversal_of: 'receive' },
      { id: 'payment', account_id: 'bank', property_id: 'house', installment_id: null, expense_id: 'material', amount_cents: -5000, occurred_on: '2026-11-03', category: 'expense', description: 'Pagamento de material', method: 'Transferência', reversal_of: null },
      { id: 'general-payment', account_id: 'cash', property_id: null, installment_id: null, expense_id: 'general', amount_cents: -3000, occurred_on: '2026-11-04', category: 'expense', description: 'Despesa administrativa', method: 'Dinheiro', reversal_of: null },
      { id: 'land-receive', account_id: 'cash', property_id: 'land', installment_id: 'i3', expense_id: null, amount_cents: 50000, occurred_on: '2026-10-01', category: 'sale', description: 'Venda de lote', method: 'Pix', reversal_of: null },
    ],
  }
}
const filters = { from: '', to: '', account: '', contact: '', property: '', segment: '', category: '', operation: '', search: '' }

describe('fichas financeiras', () => {
  it('preserva recebimentos no distrato e desconta devoluções sem transformá-las em custo', () => {
    const data = fixture()
    data.sales[0].status = 'cancelled'
    for (const item of data.installments.filter(item => item.sale_id === 'sale-house')) item.sale_status = 'cancelled'
    data.expenses.push({ ...data.expenses[0], id: 'refund', category: 'refund', contact_id: 'buyer', refund_sale_id: 'sale-house', amount_cents: 8000, paid_cents: 6000 })
    data.ledger.push({ ...data.ledger[3], id: 'refund-payment', expense_id: 'refund', amount_cents: -6000 })
    const record = financialRecord(data, 'client', 'buyer')
    expect(record.contracted).toBe(0)
    expect(record.outstanding).toBe(0)
    expect(record.cancelledTotal).toBe(100000)
    expect(record.received).toBe(4000)
    expect(record.refundPending).toBe(2000)
    expect(record.ledger.some(item => item.id === 'refund-payment')).toBe(true)
    expect(financialRecord(data, 'property', 'house').cost).toBe(60000)
    expect(entryDetails(data.ledger[0], financialIndex(data)).canReverse).toBe(false)
  })
  it('isola o cliente e mantém pagamentos parciais/estornos no saldo devedor', () => {
    const record = financialRecord(fixture(), 'client', 'buyer', '2026-11-14')
    expect(record.sales.map(item => item.id)).toEqual(['sale-house'])
    expect(record.contracted).toBe(100000)
    expect(record.received).toBe(10000)
    expect(record.outstanding).toBe(90000)
    expect(record.overdue).toBe(10000)
    expect(record.ledger.map(item => item.id)).toEqual(['reverse', 'receive-2', 'receive'])
  })
  it('inclui custos não pagos sem descontá-los do caixa e conta aquisição uma vez', () => {
    const record = financialRecord(fixture(), 'property', 'house', '2026-11-14')
    expect(record.cost).toBe(60000)
    expect(record.forecast).toBe(40000)
    expect(record.cash).toBe(5000)
    expect(record.payable).toEqual({ pending: 25000, overdue: 15000, count: 2 })
    expect(record.ledger).toHaveLength(4)
  })
  it('não apresenta preço pedido como receita contratada de imóvel sem venda', () => {
    const record = financialRecord(fixture(), 'property', 'unsold', '2026-11-14')
    expect(record.contracted).toBe(0)
    expect(record.forecast).toBeNull()
    expect(record.cash).toBe(0)
  })
  it('não altera a ordem das parcelas recebidas da API', () => {
    const data = fixture(); const order = data.installments.map(item => item.id)
    financialRecord(data, 'client', 'buyer')
    expect(data.installments.map(item => item.id)).toEqual(order)
  })
  it('consolida mais de uma venda do mesmo cliente', () => {
    const data = fixture()
    data.sales[1].contact_id = 'buyer'
    const record = financialRecord(data, 'client', 'buyer', '2026-11-14')
    expect(record.sales).toHaveLength(2)
    expect(record.contracted).toBe(150000)
    expect(record.received).toBe(60000)
    expect(record.outstanding).toBe(90000)
    expect(record.ledger.some(entry => entry.id === 'land-receive')).toBe(true)
  })
  it('reabre a obrigação após estorno da despesa sem duplicar seu custo', () => {
    const data = fixture()
    const payment = data.ledger.find(entry => entry.id === 'payment')!
    data.ledger.push({ ...payment, id: 'payment-reversal', reversal_of: payment.id, amount_cents: 5000, occurred_on: '2026-11-04' })
    data.expenses[0].paid_cents = 0
    const record = financialRecord(data, 'property', 'house', '2026-11-14')
    expect(record.cost).toBe(60000)
    expect(record.cash).toBe(10000)
    expect(record.payable).toEqual({ pending: 30000, overdue: 20000, count: 2 })
    expect(entryDetails(data.ledger.at(-1)!, financialIndex(data)).category).toBe('materials')
  })
})
describe('filtros do extrato', () => {
  it('combina período, conta, cliente e segmento, incluindo estorno do cliente', () => {
    const entries = filterLedger(fixture(), { ...filters, from: '2026-11-01', to: '2026-11-02', account: 'bank', contact: 'buyer', segment: 'house' })
    expect(entries.map(item => item.id)).toEqual(['reverse', 'receive-2', 'receive'])
    expect(ledgerTotals(entries)).toEqual({ income: 20000, outcome: 10000, result: 10000 })
  })
  it('resolve categoria e fornecedor pela despesa, em vez da categoria genérica do caixa', () => {
    const entries = filterLedger(fixture(), { ...filters, contact: 'supplier', category: 'materials' })
    expect(entries.map(item => item.id)).toEqual(['payment'])
    const detail = entryDetails(entries[0], financialIndex(fixture()))
    expect(detail.category).toBe('materials')
    expect(detail.contact?.name).toBe('Materiais Norte')
  })
  it('separa terrenos, casas, despesas gerais, saídas e estornos', () => {
    const data = fixture()
    expect(filterLedger(data, { ...filters, segment: 'land' }).map(item => item.id)).toEqual(['land-receive'])
    expect(filterLedger(data, { ...filters, segment: 'company' }).map(item => item.id)).toEqual(['general-payment'])
    expect(filterLedger(data, { ...filters, operation: 'reversal' }).map(item => item.id)).toEqual(['reverse'])
    expect(filterLedger(data, { ...filters, operation: 'out' })).toHaveLength(3)
  })
  it('busca sem diferenciar maiúsculas e mostra seleção vazia sem totais antigos', () => {
    expect(filterLedger(fixture(), { ...filters, search: '  C01  ' })).toHaveLength(4)
    const entries = filterLedger(fixture(), { ...filters, search: 'não existe' })
    expect(entries).toEqual([])
    expect(ledgerTotals(entries)).toEqual({ income: 0, outcome: 0, result: 0 })
  })
  it('mantém as pontas do intervalo e identifica a origem estornada mesmo fora do filtro', () => {
    const data = fixture()
    expect(filterLedger(data, { ...filters, from: '2026-11-01', to: '2026-11-01' })).toHaveLength(2)
    expect(entryDetails(data.ledger[0], financialIndex(data)).reversed).toBe(true)
  })
})
describe('obrigações e exportação', () => {
  it('mostra somente saldos pendentes e não trata vencimento de hoje como atraso', () => {
    expect(payableTotals(fixture().expenses, '2026-11-01')).toEqual({ pending: 25000, overdue: 0, count: 2 })
  })
  it('escapa fórmulas e aspas no CSV sem remover valores numéricos negativos', () => {
    const text = csv([['=HYPERLINK("x")', ' +SUM(1)', 'Valor "especial"', -500, '-12,50']])
    expect(text).toContain("'=" ); expect(text).toContain("' +SUM")
    expect(text).toContain('"Valor ""especial"""')
    expect(text).toContain('"-500";"-12,50"')
  })
})

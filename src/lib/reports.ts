import type { Data } from './domain'
import { installmentLabel, installmentOutstanding, today } from './domain'
import { defaultLedgerFilters, entryDetails, filterLedger, financialCategories, financialIndex, financialRecord, ledgerTotals } from './financial'
import type { LedgerFilters } from './financial'
import type { Report, ReportColumn } from './report-export'
import { cashBuckets, validPeriod } from './dashboard'

export const reportTypes = { statement: 'Extrato financeiro', monthly: 'Fluxo de caixa por período', sales: 'Vendas e contratos', receivables: 'Carteira de parcelas', receipts: 'Recebimentos de parcelas', payables: 'Contas a pagar', purchases: 'Compras e despesas', labor: 'Mão de obra e serviços', categories: 'Despesas por categoria', profitability: 'Custo e resultado por imóvel', suppliers: 'Ficha de fornecedor' }
export type ReportKind = keyof typeof reportTypes
export type ReportFilters = LedgerFilters & { status: string }
const text = (label: string): ReportColumn => ({ label })
const amount = (label: string): ReportColumn => ({ label, kind: 'money' })
const day = (label: string): ReportColumn => ({ label, kind: 'date' })
export function initialReportFilters(): ReportFilters { return { ...defaultLedgerFilters(), status: '' } }
export function statementReport(data: Data, filters: LedgerFilters): Report {
  const index = financialIndex(data), entries = filterLedger(data, filters), totals = ledgerTotals(entries)
  return { title: 'Extrato financeiro', notes: [filterDescription(data, filters), `Entradas: R$ ${(totals.income / 100).toFixed(2)} · Saídas: R$ ${(totals.outcome / 100).toFixed(2)} · Resultado de caixa: R$ ${(totals.result / 100).toFixed(2)}`, 'Estornos permanecem no histórico com sinal inverso. Resultado de caixa não equivale a lucro líquido contábil.'], columns: [day('Data'), text('Referente a quê?'), text('Categoria'), text('Pessoa'), text('Imóvel'), text('Conta'), amount('Valor'), text('Forma'), text('Situação'), text('Observações')], rows: entries.map(entry => { const detail = entryDetails(entry, index); return [entry.occurred_on, entry.description, financialCategories[detail.category] || detail.category, detail.contact?.name || '', detail.property?.code || 'Empresa', detail.account?.name || '', entry.amount_cents, entry.method, entry.reversal_of ? 'Estorno' : detail.reversed ? 'Estornado' : 'Confirmado', entry.notes || ''] }) }
}
export function filterDescription(data: Data, filters: LedgerFilters) {
  return [`Período: ${filters.from || 'início'} a ${filters.to || 'atual'}`, `Segmento: ${filters.segment === 'land' ? 'Terrenos' : filters.segment === 'house' ? 'Casas' : filters.segment === 'company' ? 'Empresa' : 'Consolidado'}`, filters.property ? `Imóvel: ${data.properties.find(p => p.id === filters.property)?.code || filters.property}` : '', filters.contact ? `Pessoa: ${data.contacts.find(p => p.id === filters.contact)?.name || filters.contact}` : '', filters.account ? `Conta: ${data.accounts.find(a => a.id === filters.account)?.name || filters.account}` : '', filters.category ? `Categoria: ${financialCategories[filters.category] || filters.category}` : '', filters.operation ? `Operação: ${filters.operation}` : '', filters.search ? `Busca: ${filters.search}` : ''].filter(Boolean).join(' · ')
}
export function buildReport(data: Data, kind: ReportKind, filters: ReportFilters): Report {
  const index = financialIndex(data)
  const notes = [filterDescription(data, kind === 'profitability' ? { ...filters, from: '', to: '', contact: '' } : filters)]
  const period = (date: string | null | undefined) => !(filters.from || filters.to) || Boolean(date && (!filters.from || date >= filters.from) && (!filters.to || date <= filters.to))
  const propertyMatches = (id: string | null) => (!filters.property || id === filters.property) && (!filters.segment || (index.properties.get(id || '')?.kind || 'company') === filters.segment)
  const personMatches = (id: string | null) => !filters.contact || id === filters.contact
  const expenses = data.expenses.filter(e => propertyMatches(e.property_id) && personMatches(e.contact_id))
  const report = (columns: ReportColumn[], rows: Report['rows'], extra = ''): Report => ({ title: reportTypes[kind], notes: [...notes, ...(extra ? [extra] : [])], columns, rows })
  if (kind === 'statement') return statementReport(data, filters)
  if (kind === 'monthly') {
    if (!validPeriod({ from: filters.from, to: filters.to })) return report([text('Período'), amount('Entradas'), amount('Saídas'), amount('Resultado')], [], 'Selecione um período válido de até dez anos.')
    return report([day('De'), day('Até'), amount('Entradas'), amount('Saídas'), amount('Resultado')], cashBuckets(filterLedger(data, filters), { from: filters.from, to: filters.to }).map(b => [b.from, b.to, b.income, b.outcome, b.result]), 'Movimentações por data de caixa, incluindo estornos. Até 12 intervalos proporcionais ao período selecionado; não inclui saldos iniciais.')
  }
  if (kind === 'sales') return report([day('Venda'), text('Cliente'), text('Imóvel'), amount('Contratado'), text('Situação')], data.sales.filter(s => propertyMatches(s.property_id) && personMatches(s.contact_id) && period(s.sold_on)).map(s => [s.sold_on, s.contacts.name, s.properties.code, s.total_cents, s.status === 'cancelled' ? 'Cancelada' : 'Ativa']), 'Filtro por data da venda. Valor contratado é separado de recebimentos; contratos cancelados são identificados.')
  if (kind === 'receipts') {
    const selected = { ...filters, category: 'sale' }
    return { ...statementReport(data, selected), title: reportTypes.receipts }
  }
  if (kind === 'receivables') return report([text('Cliente'), text('Imóvel'), text('Parcela'), day('Vencimento'), amount('Valor'), amount('Recebido líquido'), amount('Saldo'), text('Situação')], data.installments.filter(i => propertyMatches(data.sales.find(s => s.id === i.sale_id)?.property_id || null) && personMatches(data.sales.find(s => s.id === i.sale_id)?.contact_id || null) && period(i.due_on)).filter(i => !filters.status || (filters.status === 'paid' ? installmentLabel(i).label === 'Paga' : filters.status === 'late' ? installmentOutstanding(i) > 0 && i.due_on < today() : installmentOutstanding(i) > 0)).map(i => [i.client_name, i.property_code, i.number === 0 ? 'Entrada' : i.number, i.due_on, i.amount_cents, i.received_cents, installmentOutstanding(i), installmentLabel(i).label]), 'Filtro por vencimento; valores recebidos e saldos refletem a posição atual, incluindo pagamentos fora do período. Parcelas encerradas preservam seu status.')
  if (kind === 'profitability') return report([text('Imóvel'), amount('Terreno / aquisição'), amount('Demais custos'), amount('Custo acumulado'), amount('Contratado ativo'), amount('Recebido líquido'), amount('Resultado bruto previsto'), amount('Caixa registrado')], data.properties.filter(p => propertyMatches(p.id)).map(p => { const r = financialRecord(data, 'property', p.id); return [p.code, p.acquisition_cents, r.cost - p.acquisition_cents, r.cost, r.contracted, r.received, r.forecast === null ? 'Sem venda ativa' : r.forecast, r.cash] }), 'Posição atual acumulada de cada imóvel; independe do período. Não aplica filtro por pessoa. Aquisição contada uma vez; custos incorridos, ainda que não pagos. Resultado bruto previsto = contrato ativo − custo acumulado; caixa registrado exclui saldo inicial.')
  if (kind === 'categories') {
    const categories = new Map<string, number>()
    for (const e of expenses.filter(e => !['acquisition', 'refund'].includes(e.category) && period(e.purchased_on))) categories.set(e.category, (categories.get(e.category) || 0) + e.amount_cents)
    return report([text('Categoria'), amount('Custo registrado')], [...categories].map(([category, value]) => [financialCategories[category] || category, value]), 'Por data da compra/contratação, independente do pagamento. Aquisições e devoluções não integram custos operacionais. Registros antigos sem data ficam fora de períodos delimitados.')
  }
  const items = expenses.filter(e => kind === 'payables' ? e.amount_cents > e.paid_cents && period(e.due_on) : period(e.purchased_on) && (kind === 'suppliers' || !['acquisition', 'refund'].includes(e.category)) && (kind !== 'labor' || ['labor', 'services'].includes(e.category)))
  return report([day('Compra'), day('Vencimento'), text('Referente a quê?'), text('Categoria'), text('Fornecedor'), text('Imóvel'), amount('Valor'), amount('Pago atual'), amount('Saldo atual'), text('Observações')], items.map(e => [e.purchased_on || '', e.due_on, e.description, financialCategories[e.category] || e.category, index.contacts.get(e.contact_id || '')?.name || 'Sem fornecedor', index.properties.get(e.property_id || '')?.code || 'Empresa', e.amount_cents, e.paid_cents, Math.max(e.amount_cents - e.paid_cents, 0), e.notes || '']), kind === 'payables' ? 'Filtro por vencimento. Saldo atual inclui pagamentos fora do período.' : 'Filtro por data da compra/contratação. Pago e saldo refletem a posição atual; pagamentos detalhados disponíveis no extrato por fornecedor. Registros sem data ficam fora de períodos delimitados.')
}

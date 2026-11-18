import { useState } from 'react'
import { Download, FilterX } from 'lucide-react'
import type { Data, Expense } from '../lib/domain'
import { dateLabel, money, today } from '../lib/domain'
import { emptyPurchaseFilters, filterPurchases, purchaseCategories, purchaseTotals } from '../lib/purchases'
import type { PurchaseFilters } from '../lib/purchases'
import { downloadCsv } from '../lib/financial'
import { ReportExport } from '../components/ReportExport'
import { filterDescription, initialReportFilters } from '../lib/reports'
import { FinanceMetric, FinanceTable } from '../components/FinanceUI'
export function Purchases({ data, financial, onPay, onDocuments }: { data: Data; financial: boolean; onPay: (item: Expense) => void; onDocuments: (item: Expense) => void }) {
  const [filters, setFilters] = useState(emptyPurchaseFilters)
  const items = filterPurchases(data, filters)
  const total = purchaseTotals(items)
  const invalidPeriod = filters.date !== 'undated' && Boolean(filters.from && filters.to && filters.from > filters.to)
  function change<K extends keyof PurchaseFilters>(key: K, value: PurchaseFilters[K]) { setFilters(current => ({ ...current, [key]: value })) }
  const supplier = (item: Expense) => data.contacts.find(contact => contact.id === item.contact_id)?.name || 'Não informado'
  const property = (item: Expense) => data.properties.find(property => property.id === item.property_id)?.code || 'Empresa'
  function exportSelection() {
    const decimal = (value: number) => (value / 100).toFixed(2).replace('.', ',')
    downloadCsv('compras-despesas.csv', [
      ['Registro de compras e despesas', 'Totais e pagamentos atuais dos registros selecionados'],
      ['Filtro de data', filters.date === 'due' ? 'Vencimento' : filters.date === 'undated' ? 'Sem data da compra' : 'Data da compra'], ['De', filters.date === 'undated' ? '' : filters.from], ['Até', filters.date === 'undated' ? '' : filters.to],
      ['Total registrado (R$)', decimal(total.amount)], ...(financial ? [['Pago até agora (R$)', decimal(total.paid)], ['Pendente (R$)', decimal(total.pending)], ['Vencido (R$)', decimal(total.overdue)]] : []), [],
      ['Data da compra', 'Vencimento', 'Descrição', 'Categoria', 'Classificação', 'Fornecedor', 'Imóvel', 'Quantidade', 'Unidade', 'Total (R$)', ...(financial ? ['Pago até agora (R$)', 'Pendente (R$)'] : []), 'Observações'],
      ...items.map(item => [item.purchased_on || '', item.due_on, item.description, purchaseCategories[item.category] || item.category, item.classification || '', supplier(item), property(item), item.unit === 'registro' ? '' : item.quantity, item.unit === 'registro' ? '' : item.unit, decimal(item.amount_cents), ...(financial ? [decimal(item.paid_cents), decimal(Math.max(item.amount_cents - item.paid_cents, 0))] : []), item.notes || '']),
    ])
  }
  return <>
    <section className="panel statement-filters" aria-label="Filtros de compras e despesas">
      <div className="filter-heading"><h2>Consultar compras e despesas</h2><button className="small secondary" onClick={() => setFilters(emptyPurchaseFilters())}><FilterX size={16} aria-hidden="true" />Limpar filtros</button></div>
      <div className="financial-filter-grid">
        <label>Consultar período por<select value={filters.date} onChange={event => change('date', event.target.value as PurchaseFilters['date'])}><option value="purchase">Data da compra</option><option value="due">Vencimento</option><option value="undated">Sem data da compra (histórico)</option></select></label>
        <label>De<input aria-label="Compras de" type="date" disabled={filters.date === 'undated'} value={filters.from} max={filters.to || undefined} onChange={event => change('from', event.target.value)} /></label>
        <label>Até<input aria-label="Compras até" type="date" disabled={filters.date === 'undated'} value={filters.to} min={filters.from || undefined} onChange={event => change('to', event.target.value)} /></label>
        <label>Imóvel / obra<select value={filters.property} onChange={event => change('property', event.target.value)}><option value="">Todos os imóveis e empresa</option><option value="company">Despesas gerais da empresa</option>{data.properties.map(item => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>
        <label>Fornecedor / prestador<select value={filters.contact} onChange={event => change('contact', event.target.value)}><option value="">Todos</option>{data.contacts.filter(item => ['supplier', 'provider'].includes(item.kind)).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Categoria<select value={filters.category} onChange={event => change('category', event.target.value)}><option value="">Todas</option>{Object.entries(purchaseCategories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {financial ? <label>Situação do pagamento<select value={filters.status} onChange={event => change('status', event.target.value)}><option value="">Todas</option><option value="pending">Com saldo pendente</option><option value="partial">Pagas parcialmente</option><option value="paid">Pagas</option><option value="late">Vencidas e pendentes</option></select></label> : null}
        <label className="financial-search">Pesquisar compra ou despesa<input type="search" value={filters.search} onChange={event => change('search', event.target.value)} placeholder="Descrição, classificação, observações, fornecedor ou imóvel" /></label>
      </div>
      <div className="purchase-period-actions"><button className="small secondary" onClick={() => setFilters(current => ({ ...current, date: current.date === 'undated' ? 'purchase' : current.date, from: today(), to: today() }))}>Hoje</button><button className="small secondary" onClick={() => setFilters(current => ({ ...current, date: current.date === 'undated' ? 'purchase' : current.date, from: today().slice(0, 7) + '-01', to: today() }))}>Este mês até hoje</button><button className="small secondary" onClick={() => setFilters(current => ({ ...current, date: current.date === 'undated' ? 'purchase' : current.date, from: today().slice(0, 4) + '-01-01', to: today() }))}>Este ano até hoje</button></div>
      {invalidPeriod ? <p role="alert" className="notice error">A data inicial deve ser anterior ou igual à data final.</p> : null}
      <p className="form-hint">O período seleciona os registros pela data indicada. Os valores pagos e pendentes refletem a situação atual, incluindo pagamentos fora desse período. Para consultar as saídas por data de pagamento, use o Financeiro.</p>
      {data.expenses.some(item => !['refund', 'acquisition'].includes(item.category) && !item.purchased_on) ? <p className="form-hint">Há registros antigos sem data da compra. Eles aparecem na consulta sem período ou na opção “Sem data da compra (histórico)”.</p> : null}
    </section>
    <section className={financial ? 'stats' : 'stats three'} aria-label="Totais de compras selecionadas"><FinanceMetric label="Total registrado" value={total.amount} note={`${items.length} registros na seleção`} accent />{financial ? <><FinanceMetric label="Pago até agora" value={total.paid} note="Pagamentos líquidos de estornos" /><FinanceMetric label="Saldo a pagar" value={total.pending} note="Situação atual da seleção" /><FinanceMetric label="Saldo vencido" value={total.overdue} note="Somente obrigações ainda pendentes" /></> : null}</section>
    <section className="panel"><div className="panel-heading"><div><h2>Histórico de compras e despesas</h2><p role="status">{items.length} registros encontrados · aquisições e devoluções de distrato ficam no Financeiro</p></div><div><ReportExport report={{ title: 'Compras e despesas', notes: [filterDescription(data, { ...initialReportFilters(), from: filters.from, to: filters.to, property: filters.property, contact: filters.contact, category: filters.category, search: filters.search }), `Data consultada: ${filters.date} · Situação: ${filters.status || 'todas'} · Pagamentos e saldos atuais`], columns: [{ label: 'Compra', kind: 'date' }, { label: 'Vencimento', kind: 'date' }, { label: 'Referente a quê?' }, { label: 'Categoria' }, { label: 'Fornecedor' }, { label: 'Imóvel' }, { label: 'Valor', kind: 'money' }, ...(financial ? [{ label: 'Pago atual', kind: 'money' as const }, { label: 'Saldo atual', kind: 'money' as const }] : []), { label: 'Observações' }], rows: items.map(item => [item.purchased_on || '', item.due_on, item.description, purchaseCategories[item.category] || item.category, supplier(item), property(item), item.amount_cents, ...(financial ? [item.paid_cents, Math.max(item.amount_cents - item.paid_cents, 0)] : []), item.notes || '']) }} /><button className="small text-button" disabled={!items.length || invalidPeriod} onClick={exportSelection}><Download size={14} aria-hidden="true" />CSV detalhado com quantidades</button></div></div>
      <FinanceTable headers={['Compra / vencimento', 'O que foi comprado?', 'Fornecedor / imóvel', 'Total', ...(financial ? ['Pago / pendente', 'Situação'] : []), 'Ações']} empty={!items.length ? 'Nenhuma compra ou despesa encontrada' : undefined}>{items.map(item => {
        const pending = Math.max(item.amount_cents - item.paid_cents, 0)
        return <tr key={item.id}><td>{item.purchased_on ? dateLabel(item.purchased_on) : 'Compra: data não informada'}<small>Vence: {dateLabel(item.due_on)}</small></td><td className="purchase-description"><strong>{item.description}</strong><small>{purchaseCategories[item.category] || item.category}{item.classification ? ` · ${item.classification}` : ''}</small>{item.unit !== 'registro' ? <small>{item.quantity} {item.unit}</small> : null}{item.notes ? <small>{item.notes}</small> : null}</td><td>{supplier(item)}<small>{property(item)}</small></td><td>{money(item.amount_cents)}</td>{financial ? <><td>{money(item.paid_cents)} pagos<small>{money(pending)} pendentes</small></td><td><span className={`badge ${pending === 0 ? 'success' : item.due_on < today() ? 'danger' : 'warning'}`}>{pending === 0 ? 'Paga' : item.due_on < today() ? 'Vencida' : item.paid_cents > 0 ? 'Paga parcialmente' : 'A pagar'}</span></td></> : null}<td><div className="row-actions commercial-actions">{financial && pending > 0 ? <button className="small secondary" onClick={() => onPay(item)}>Pagar</button> : null}<button className="small secondary" onClick={() => onDocuments(item)}>Comprovantes</button></div></td></tr>
      })}</FinanceTable>
    </section>
  </>
}

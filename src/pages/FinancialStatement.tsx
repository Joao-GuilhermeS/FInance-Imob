import { useState } from 'react'
import { Download, FilterX, Wallet } from 'lucide-react'
import type { Data, Entry, Expense } from '../lib/domain'
import { dateLabel, money, today } from '../lib/domain'
import { defaultLedgerFilters, downloadCsv, entryDetails, filterLedger, financialCategories, financialIndex, ledgerTotals, payableTotals } from '../lib/financial'
import type { LedgerFilters } from '../lib/financial'
import { FinanceMetric, FinanceTable, LedgerTable } from '../components/FinanceUI'

export function FinancialStatement({ data, onReverse, onPay }: { data: Data; onReverse: (entry: Entry) => void; onPay: (expense: Expense) => void }) {
  const [filters, setFilters] = useState(defaultLedgerFilters)
  const entries = filterLedger(data, filters)
  const total = ledgerTotals(entries)
  const pending = data.expenses.filter(expense => expense.paid_cents < expense.amount_cents)
    .sort((a, b) => a.due_on.localeCompare(b.due_on) || a.id.localeCompare(b.id))
  const payable = payableTotals(data.expenses)
  const index = financialIndex(data)
  const availableCategories = [...new Set(data.ledger.map(entry => entryDetails(entry, index).category))].sort()
  function change(key: keyof LedgerFilters, value: string) { setFilters(current => ({ ...current, [key]: value })) }
  function exportStatement() {
    const index = financialIndex(data)
    downloadCsv(`extrato-${filters.from || 'inicio'}-${filters.to || 'atual'}.csv`, [
      ['Data', 'Descrição', 'Categoria', 'Pessoa', 'Imóvel', 'Conta', 'Valor (R$)', 'Forma', 'Situação'],
      ...entries.map(entry => {
        const detail = entryDetails(entry, index)
        return [entry.occurred_on, entry.description, financialCategories[detail.category] || detail.category,
          detail.contact?.name || '', detail.property?.code || 'Empresa', detail.account?.name || '',
          (entry.amount_cents / 100).toFixed(2).replace('.', ','), entry.method,
          entry.reversal_of ? 'Estorno' : detail.reversed ? 'Lançamento estornado' : 'Confirmado']
      }),
    ])
  }
  return <>
    <section className="account-grid" aria-label="Saldos atuais das contas">{data.accounts.map(account => <article className="panel account" key={account.id}><Wallet size={21} aria-hidden="true" /><span>{account.name}</span><strong>{money(account.opening_cents + data.ledger.filter(entry => entry.account_id === account.id).reduce((sum, entry) => sum + entry.amount_cents, 0))}</strong><small>Saldo atual · inicial: {money(account.opening_cents)}</small></article>)}</section>
    {!data.accounts.length ? <div className="notice">Adicione uma conta e informe o saldo inicial para começar a registrar pagamentos.</div> : null}
    <section className="panel statement-filters" aria-label="Filtros do extrato">
      <div className="filter-heading"><h2>Filtrar movimentações</h2><button className="secondary small" onClick={() => setFilters(defaultLedgerFilters())}><FilterX size={16} aria-hidden="true" />Restaurar filtros</button></div>
      <div className="financial-filter-grid">
        <label>Data inicial<input type="date" value={filters.from} max={filters.to || undefined} onChange={event => change('from', event.target.value)} /></label>
        <label>Data final<input type="date" value={filters.to} min={filters.from || undefined} onChange={event => change('to', event.target.value)} /></label>
        <label>Conta / caixa<select value={filters.account} onChange={event => change('account', event.target.value)}><option value="">Todas as contas</option>{data.accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
        <label>Cliente / fornecedor<select value={filters.contact} onChange={event => change('contact', event.target.value)}><option value="">Todas as pessoas</option>{data.contacts.map(contact => <option key={contact.id} value={contact.id}>{contact.name}</option>)}</select></label>
        <label>Segmento<select value={filters.segment} onChange={event => change('segment', event.target.value)}><option value="">Empresa consolidada</option><option value="land">Terrenos</option><option value="house">Casas</option><option value="company">Despesas gerais da empresa</option></select></label>
        <label>Imóvel<select value={filters.property} onChange={event => change('property', event.target.value)}><option value="">Todos os imóveis</option>{data.properties.map(property => <option key={property.id} value={property.id}>{property.code} · {property.name}</option>)}</select></label>
        <label>Categoria<select value={filters.category} onChange={event => change('category', event.target.value)}><option value="">Todas as categorias</option>{availableCategories.map(category => <option key={category} value={category}>{financialCategories[category] || category}</option>)}</select></label>
        <label>Operação<select value={filters.operation} onChange={event => change('operation', event.target.value)}><option value="">Todas as operações</option><option value="in">Entradas no caixa</option><option value="out">Saídas do caixa</option><option value="reversal">Somente estornos</option></select></label>
        <label className="financial-search">Buscar no extrato<input type="search" placeholder="Descrição, pessoa, imóvel ou forma de pagamento" value={filters.search} onChange={event => change('search', event.target.value)} /></label>
      </div>
    </section>
    <section className="stats three" aria-label="Totais do extrato filtrado"><FinanceMetric label="Entradas da seleção" value={total.income} note="Inclui estornos de pagamentos" /><FinanceMetric label="Saídas da seleção" value={total.outcome} note="Inclui estornos de recebimentos" /><FinanceMetric label="Resultado de caixa da seleção" value={total.result} note="Entradas menos saídas filtradas" accent /></section>
    <section className="panel"><div className="panel-heading"><div><h2>Extrato de movimentações</h2><p role="status" aria-live="polite">{entries.length} {entries.length === 1 ? 'movimentação encontrada' : 'movimentações encontradas'} · saldos das contas acima não são filtrados</p></div><button className="secondary" onClick={exportStatement} disabled={!entries.length}><Download size={16} aria-hidden="true" />Exportar seleção CSV</button></div><LedgerTable entries={entries} data={data} onReverse={onReverse} /></section>
    <section className="panel payable"><div className="panel-heading"><div><h2>Contas a pagar</h2><p>Todos os vencimentos · independente dos filtros do extrato</p></div><strong>{money(payable.pending)}</strong></div><FinanceTable headers={['Despesa / fornecedor', 'Imóvel', 'Vencimento', 'Saldo a pagar', 'Situação', 'Ação']} empty={!pending.length ? 'Nenhuma conta pendente' : undefined}>{pending.map(expense => <tr key={expense.id}><td><strong>{expense.description}</strong><small>{data.contacts.find(contact => contact.id === expense.contact_id)?.name || 'Sem fornecedor'}</small></td><td>{data.properties.find(property => property.id === expense.property_id)?.code || 'Empresa'}</td><td>{dateLabel(expense.due_on)}</td><td>{money(expense.amount_cents - expense.paid_cents)}</td><td><span className={`badge ${expense.due_on < today() ? 'danger' : 'neutral'}`}>{expense.due_on < today() ? 'Em atraso' : expense.paid_cents ? 'Paga parcialmente' : 'A pagar'}</span></td><td><button className="small secondary" onClick={() => onPay(expense)}>Pagar</button></td></tr>)}</FinanceTable></section>
  </>
}

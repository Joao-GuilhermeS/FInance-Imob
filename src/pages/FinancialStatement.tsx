import { useState } from 'react'
import { Download, FilterX, Wallet } from 'lucide-react'
import type { Account, Data, Entry, Expense } from '../lib/domain'
import { dateLabel, money, today } from '../lib/domain'
import { defaultLedgerFilters, downloadCsv, entryDetails, filterLedger, financialCategories, financialIndex, ledgerTotals, payableTotals } from '../lib/financial'
import type { LedgerFilters } from '../lib/financial'
import { cashPosition } from '../lib/dashboard'
import { FinanceMetric, FinanceTable, LedgerTable } from '../components/FinanceUI'

export function FinancialStatement({ data, onReverse, onPay, onDocuments, segment, onClassify }: { data: Data; onReverse: (entry: Entry) => void; onPay: (expense: Expense) => void; onDocuments: (entry: Entry) => void; segment?: 'land' | 'house'; onClassify: (account: Account) => void }) {
  const [filters, setFilters] = useState(() => ({ ...defaultLedgerFilters(), segment: segment || '' }))
  const entries = filterLedger(data, filters)
  const total = ledgerTotals(entries)
  const scopedExpenses = data.expenses.filter(e => !segment || data.properties.some(p => p.id === e.property_id && p.kind === segment))
  const pending = scopedExpenses.filter(expense => expense.paid_cents < expense.amount_cents)
    .sort((a, b) => a.due_on.localeCompare(b.due_on) || a.id.localeCompare(b.id))
  const payable = payableTotals(scopedExpenses)
  const index = financialIndex(data)
  const availableCategories = [...new Set(data.ledger.map(entry => entryDetails(entry, index).category))].sort()
  function change(key: keyof LedgerFilters, value: string) { setFilters(current => ({ ...current, [key]: value })) }
  function exportStatement() {
    const index = financialIndex(data)
    downloadCsv(`extrato-${filters.from || 'inicio'}-${filters.to || 'atual'}.csv`, [
      ['Data', 'Descrição', 'Categoria', 'Pessoa', 'Imóvel', 'Conta', 'Valor (R$)', 'Forma', 'Situação', 'Observações'],
      ...entries.map(entry => {
        const detail = entryDetails(entry, index)
        return [entry.occurred_on, entry.description, financialCategories[detail.category] || detail.category,
          detail.contact?.name || '', detail.property?.code || 'Empresa', detail.account?.name || '',
          (entry.amount_cents / 100).toFixed(2).replace('.', ','), entry.method,
          entry.reversal_of ? 'Estorno' : detail.reversed ? 'Lançamento estornado' : 'Confirmado', entry.notes || '']
      }),
    ])
  }
  return <>
    {segment ? <div className="notice"><strong>Saldo atribuído ao segmento: {money(cashPosition(data, segment, today()))}</strong><p>Inclui movimentações vinculadas aos imóveis e saldos iniciais de contas exclusivas deste segmento. Saldos iniciais de contas gerais não são rateados.</p></div> : null}
    <section className="account-grid" aria-label="Saldos atuais das contas">{data.accounts.filter(account => !segment || account.segment === segment).map(account => <article className="panel account" key={account.id}><Wallet size={21} aria-hidden="true" /><span>{account.name}</span><strong>{money(account.opening_cents + data.ledger.filter(entry => entry.account_id === account.id).reduce((sum, entry) => sum + entry.amount_cents, 0))}</strong><small>Saldo atual · inicial: {money(account.opening_cents)}</small><small>{account.segment === 'land' ? 'Terrenos' : account.segment === 'house' ? 'Casas e obras' : 'Geral / empresa'} · {account.opening_on ? dateLabel(account.opening_on) : 'Data inicial não informada'}</small><button className="secondary small" onClick={() => onClassify(account)}>Classificar conta</button></article>)}</section>
    {!data.accounts.length ? <div className="notice">Adicione uma conta e informe o saldo inicial para começar a registrar pagamentos.</div> : null}
    <section className="panel statement-filters" aria-label="Filtros do extrato">
      <div className="filter-heading"><h2>Filtrar movimentações</h2><button className="secondary small" onClick={() => setFilters({ ...defaultLedgerFilters(), segment: segment || '' })}><FilterX size={16} aria-hidden="true" />Restaurar filtros</button></div>
      <div className="financial-filter-grid">
        <label>Data inicial<input type="date" value={filters.from} max={filters.to || undefined} onChange={event => change('from', event.target.value)} /></label>
        <label>Data final<input type="date" value={filters.to} min={filters.from || undefined} onChange={event => change('to', event.target.value)} /></label>
        <label>Conta / caixa<select value={filters.account} onChange={event => change('account', event.target.value)}><option value="">Todas as contas</option>{data.accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
        <label>Cliente / fornecedor<select value={filters.contact} onChange={event => change('contact', event.target.value)}><option value="">Todas as pessoas</option>{data.contacts.map(contact => <option key={contact.id} value={contact.id}>{contact.name}</option>)}</select></label>
        <label>Segmento<select disabled={Boolean(segment)} value={filters.segment} onChange={event => change('segment', event.target.value)}><option value="">Empresa consolidada</option><option value="land">Terrenos</option><option value="house">Casas</option><option value="company">Despesas gerais da empresa</option></select></label>
        <label>Imóvel<select value={filters.property} onChange={event => change('property', event.target.value)}><option value="">Todos os imóveis</option>{data.properties.map(property => <option key={property.id} value={property.id}>{property.code} · {property.name}</option>)}</select></label>
        <label>Categoria<select value={filters.category} onChange={event => change('category', event.target.value)}><option value="">Todas as categorias</option>{availableCategories.map(category => <option key={category} value={category}>{financialCategories[category] || category}</option>)}</select></label>
        <label>Operação<select value={filters.operation} onChange={event => change('operation', event.target.value)}><option value="">Todas as operações</option><option value="in">Entradas no caixa</option><option value="out">Saídas do caixa</option><option value="reversal">Somente estornos</option></select></label>
        <label className="financial-search">Buscar no extrato<input type="search" placeholder="Descrição, pessoa, imóvel ou forma de pagamento" value={filters.search} onChange={event => change('search', event.target.value)} /></label>
      </div>
    </section>
    <section className="stats three" aria-label="Totais do extrato filtrado"><FinanceMetric label="Entradas da seleção" value={total.income} note="Inclui estornos de pagamentos" /><FinanceMetric label="Saídas da seleção" value={total.outcome} note="Inclui estornos de recebimentos" /><FinanceMetric label="Resultado de caixa da seleção" value={total.result} note="Entradas menos saídas filtradas" accent /></section>
    <section className="panel"><div className="panel-heading"><div><h2>Extrato de movimentações</h2><p role="status" aria-live="polite">{entries.length} {entries.length === 1 ? 'movimentação encontrada' : 'movimentações encontradas'} · saldos das contas acima não são filtrados</p></div><button className="secondary" onClick={exportStatement} disabled={!entries.length}><Download size={16} aria-hidden="true" />Exportar seleção CSV</button></div><LedgerTable entries={entries} data={data} onReverse={onReverse} onDocuments={onDocuments} /></section>
    <section className="panel payable"><div className="panel-heading"><div><h2>Contas a pagar</h2><p>Todos os vencimentos · independente dos filtros do extrato</p></div><strong>{money(payable.pending)}</strong></div><FinanceTable headers={['Despesa / fornecedor', 'Imóvel', 'Vencimento', 'Saldo a pagar', 'Situação', 'Ação']} empty={!pending.length ? 'Nenhuma conta pendente' : undefined}>{pending.map(expense => <tr key={expense.id}><td><strong>{expense.description}</strong>{expense.category === 'acquisition' ? <small>Aquisição · {money(expense.opening_paid_cents || 0)} reconhecidos antes do controle</small> : null}<small>{data.contacts.find(contact => contact.id === expense.contact_id)?.name || 'Sem fornecedor'}</small></td><td>{data.properties.find(property => property.id === expense.property_id)?.code || 'Empresa'}</td><td>{dateLabel(expense.due_on)}</td><td>{money(expense.amount_cents - expense.paid_cents)}</td><td><span className={`badge ${expense.due_on < today() ? 'danger' : 'neutral'}`}>{expense.due_on < today() ? 'Em atraso' : expense.paid_cents ? 'Paga parcialmente' : 'A pagar'}</span></td><td><button className="small secondary" onClick={() => onPay(expense)}>Pagar</button></td></tr>)}</FinanceTable></section>
  </>
}

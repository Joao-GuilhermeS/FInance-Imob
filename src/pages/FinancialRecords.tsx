import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Download, FileSearch } from 'lucide-react'
import type { Data } from '../lib/domain'
import { dateLabel, installmentState, money } from '../lib/domain'
import { downloadCsv, entryDetails, financialCategories, financialIndex, financialRecord } from '../lib/financial'
import { FinanceMetric, FinanceTable, LedgerTable } from '../components/FinanceUI'

export function FinancialRecords({ data }: { data: Data }) {
  const [params, setParams] = useSearchParams()
  const kind = params.get('tipo') === 'imovel' ? 'property' : 'client'
  const id = params.get('id') || ''
  const people = data.contacts.filter(contact => contact.kind === 'client')
  const entity = kind === 'client' ? people.find(contact => contact.id === id) : data.properties.find(property => property.id === id)
  const record = entity ? financialRecord(data, kind, id) : null
  function exportRecord() {
    if (!record || !entity) return
    const index = financialIndex(data)
    const decimal = (amount: number) => (amount / 100).toFixed(2).replace('.', ',')
    downloadCsv(`ficha-${kind}-${id}.csv`, [
      ['Ficha financeira', entity.name], ['Valor contratado (R$)', (record.contracted / 100).toFixed(2).replace('.', ',')],
      ['Recebido líquido (R$)', (record.received / 100).toFixed(2).replace('.', ',')],
      ['Saldo a receber (R$)', (record.outstanding / 100).toFixed(2).replace('.', ',')],
      ['Em atraso (R$)', decimal(record.overdue)],
      ...(kind === 'property' ? [
        ['Custo acumulado (R$)', decimal(record.cost)],
        ['Resultado previsto / provisório (R$)', record.forecast === null ? 'Sem venda' : decimal(record.forecast)],
        ['Resultado de caixa registrado (R$)', decimal(record.cash)],
        ['Saldo a pagar (R$)', decimal(record.payable.pending)],
      ] : []), [],
      ['Vendas e contratos'], ['Data', 'Cliente', 'Imóvel', 'Valor contratado (R$)'],
      ...record.sales.map(sale => [sale.sold_on, sale.contacts.name, sale.properties.code, decimal(sale.total_cents)]), [],
      ['Parcelas e recebimentos'],
      ['Cliente', 'Imóvel', 'Parcela', 'Vencimento', 'Valor (R$)', 'Recebido líquido (R$)', 'Saldo (R$)', 'Situação'],
      ...record.installments.map(item => [item.client_name, item.property_code, item.number === 0 ? 'Entrada' : item.number,
        item.due_on, (item.amount_cents / 100).toFixed(2).replace('.', ','), (item.received_cents / 100).toFixed(2).replace('.', ','),
        ((item.amount_cents - item.received_cents) / 100).toFixed(2).replace('.', ','), installmentState(item.amount_cents, item.received_cents, item.due_on).label]),
      [], ['Custos e obrigações'], ['Descrição', 'Categoria', 'Vencimento', 'Custo (R$)', 'Pago (R$)', 'Saldo a pagar (R$)'],
      ...record.expenses.map(expense => [expense.description, financialCategories[expense.category] || expense.category, expense.due_on, decimal(expense.amount_cents), decimal(expense.paid_cents), decimal(expense.amount_cents - expense.paid_cents)]),
      [], ['Histórico de movimentações'], ['Data', 'Descrição', 'Conta', 'Valor (R$)', 'Forma', 'Situação'],
      ...record.ledger.map(entry => {
        const detail = entryDetails(entry, index)
        return [entry.occurred_on, entry.description, detail.account?.name || '', decimal(entry.amount_cents), entry.method, entry.reversal_of ? 'Estorno' : detail.reversed ? 'Lançamento estornado' : 'Confirmado']
      }),
    ])
  }
  return <>
    <section className="page-heading"><div><p className="eyebrow">HISTÓRICO FINANCEIRO</p><h1>Fichas financeiras</h1><p>Consulte o saldo e a história de cada cliente ou imóvel.</p></div>
      {record ? <button className="secondary" onClick={exportRecord}><Download size={17} aria-hidden="true" />Exportar ficha CSV</button> : null}</section>
    <section className="panel record-picker" aria-label="Selecionar ficha financeira">
      <label>Consultar por<select value={kind} onChange={event => setParams({ tipo: event.target.value === 'property' ? 'imovel' : 'cliente' })}><option value="client">Cliente</option><option value="property">Imóvel</option></select></label>
      <label>{kind === 'client' ? 'Cliente' : 'Imóvel'}<select value={entity ? id : ''} onChange={event => setParams({ tipo: kind === 'client' ? 'cliente' : 'imovel', id: event.target.value })}>
        <option value="">Selecione {kind === 'client' ? 'um cliente' : 'um imóvel'}</option>
        {kind === 'client' ? people.map(contact => <option key={contact.id} value={contact.id}>{contact.name}{contact.document ? ` · ${contact.document}` : ''}</option>)
          : data.properties.map(property => <option key={property.id} value={property.id}>{property.code} · {property.name}</option>)}
      </select></label>
    </section>
    {!record || !entity ? <section className="panel"><div className="empty"><FileSearch size={32} aria-hidden="true" /><h2>{id ? 'Ficha não localizada' : 'Uma visão completa, sem perder os detalhes'}</h2><p>{id ? 'O registro pode não existir ou não estar disponível para este acesso. Selecione outro cliente ou imóvel.' : 'Selecione um cliente ou imóvel para consultar vendas, vencimentos e movimentações.'}</p></div></section> : <>
      <section className="panel record-identity"><div><p className="eyebrow">{kind === 'client' ? 'FICHA DO CLIENTE' : 'FICHA DO IMÓVEL'}</p><h2>{entity.name}</h2>
        {kind === 'client' && 'document' in entity ? <p>{entity.document || 'Documento não informado'} · {entity.phone || 'Telefone não informado'}</p> : record.property ? <p>{record.property.code} · {record.property.address}</p> : null}</div>
        <span className="badge">{record.sales.length} {record.sales.length === 1 ? 'venda vinculada' : 'vendas vinculadas'}</span></section>
      <section className="stats financial-record-metrics"><FinanceMetric label="Valor contratado" value={record.contracted} note="Total dos contratos vinculados" accent /><FinanceMetric label="Recebido líquido" value={record.received} note="Pagamentos menos seus estornos" /><FinanceMetric label="Saldo a receber" value={record.outstanding} note="Inclui parcelas futuras e vencidas" /><FinanceMetric label="Saldo em atraso" value={record.overdue} note="Somente o valor ainda pendente" /></section>
      {kind === 'property' ? <>
        <section className="stats"><FinanceMetric label="Custo acumulado" value={record.cost} note="Aquisição + despesas incorridas" /><article className="stat"><div className="stat-top">Resultado previsto / provisório</div><strong>{record.forecast === null ? 'Sem venda' : money(record.forecast)}</strong><small>Valor contratado menos custo acumulado</small></article><FinanceMetric label="Resultado de caixa" value={record.cash} note="Entradas menos saídas registradas" /><FinanceMetric label="Saldo a pagar" value={record.payable.pending} note={`${record.payable.count} despesas com saldo em aberto`} /></section>
        <p className="notice">O custo de aquisição compõe o resultado previsto uma única vez. O resultado de caixa considera apenas pagamentos e recebimentos registrados no sistema; não inclui o saldo inicial das contas. Despesas administrativas sem vínculo com o imóvel não são rateadas aqui.</p>
      </> : null}
      <section className="panel record-section"><div className="panel-heading"><div><h2>Vendas e contratos</h2><p>Valores contratados, separados dos recebimentos</p></div><Link className="inline-link" to="/vendas">Consultar vendas<ArrowRight size={16} aria-hidden="true" /></Link></div>
        <FinanceTable headers={['Data', 'Cliente', 'Imóvel', 'Valor contratado']} empty={!record.sales.length ? 'Nenhuma venda vinculada' : undefined}>{record.sales.map(sale => <tr key={sale.id}><td>{dateLabel(sale.sold_on)}</td><td>{sale.contacts.name}</td><td>{sale.properties.code}<small>{sale.properties.name}</small></td><td>{money(sale.total_cents)}</td></tr>)}</FinanceTable></section>
      <section className="panel record-section"><div className="panel-heading"><div><h2>Parcelas e saldo devedor</h2><p>Entradas previstas, pagamentos parciais e antecipações</p></div><Link to="/parcelas" className="inline-link">Registrar recebimento<ArrowRight size={16} aria-hidden="true" /></Link></div>
        <FinanceTable headers={['Imóvel / cliente', 'Parcela', 'Vencimento', 'Valor', 'Recebido', 'Saldo', 'Situação']} empty={!record.installments.length ? 'Nenhuma parcela vinculada' : undefined}>{record.installments.map(item => { const state = installmentState(item.amount_cents, item.received_cents, item.due_on); return <tr key={item.id}><td>{item.property_code}<small>{item.client_name}</small></td><td>{item.number === 0 ? 'Entrada' : item.number}</td><td>{dateLabel(item.due_on)}</td><td>{money(item.amount_cents)}</td><td>{money(item.received_cents)}</td><td>{money(item.amount_cents - item.received_cents)}</td><td><span className={`badge ${state.tone}`}>{state.label}</span></td></tr> })}</FinanceTable></section>
      {kind === 'property' ? <section className="panel record-section"><div className="panel-heading"><div><h2>Custos e obrigações</h2><p>Despesas do imóvel, incluindo valores ainda não pagos</p></div></div><FinanceTable headers={['Descrição', 'Categoria', 'Vencimento', 'Custo', 'Pago', 'Saldo a pagar']} empty={!record.expenses.length ? 'Nenhuma despesa vinculada' : undefined}>{record.expenses.map(expense => <tr key={expense.id}><td>{expense.description}</td><td>{financialCategories[expense.category] || expense.category}</td><td>{dateLabel(expense.due_on)}</td><td>{money(expense.amount_cents)}</td><td>{money(expense.paid_cents)}</td><td>{money(expense.amount_cents - expense.paid_cents)}</td></tr>)}</FinanceTable></section> : null}
      <section className="panel record-section"><div className="panel-heading"><div><h2>Histórico de movimentações</h2><p>Pagamentos, recebimentos e estornos preservados · todo o período</p></div></div><LedgerTable entries={record.ledger} data={data} /></section>
    </>}
  </>
}

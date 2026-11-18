import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { filterLedger } from '../lib/financial'
import { statementReport } from '../lib/reports'
import type { Data } from '../lib/domain'
import { buildReport, initialReportFilters, reportTypes } from '../lib/reports'
import type { ReportFilters, ReportKind } from '../lib/reports'
import { reportCell } from '../lib/report-export'
import { ReportExport } from '../components/ReportExport'
import { FinanceTable, LedgerTable } from '../components/FinanceUI'

export function Reports({ data }: { data: Data }) {
  const [params] = useSearchParams()
  const [kind, setKind] = useState<ReportKind>(() => params.get('relatorio') === 'suppliers' ? 'suppliers' : 'statement')
  const [filters, setFilters] = useState(() => params.get('pessoa') ? { ...initialReportFilters(), from: '', to: '', contact: params.get('pessoa')! } : initialReportFilters())
  const invalid = Boolean(filters.from && filters.to && filters.from > filters.to)
  const report = buildReport(data, kind, filters)
  function change(key: keyof ReportFilters, value: string) { setFilters(current => ({ ...current, [key]: value })) }
  const position = kind === 'profitability'
  return <>
    <section className="page-heading"><div><p className="eyebrow">ANÁLISE E EXPORTAÇÃO</p><h1>Relatórios financeiros</h1><p>Compare compromissos, custos e movimentos reais do caixa.</p></div>{!invalid || position ? <ReportExport report={report} /> : null}</section>
    <section className="panel statement-filters"><div className="financial-filter-grid">
      <label>Relatório<select value={kind} onChange={e => setKind(e.target.value as ReportKind)}>{Object.entries(reportTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>De<input type="date" disabled={position} value={filters.from} max={filters.to || undefined} onChange={e => change('from', e.target.value)} /></label>
      <label>Até<input type="date" disabled={position} value={filters.to} min={filters.from || undefined} onChange={e => change('to', e.target.value)} /></label>
      <label>Segmento<select value={filters.segment} onChange={e => change('segment', e.target.value)}><option value="">Consolidado</option><option value="land">Terrenos</option><option value="house">Casas e obras</option><option value="company">Empresa</option></select></label>
      <label>Imóvel<select value={filters.property} onChange={e => change('property', e.target.value)}><option value="">Todos</option>{data.properties.map(p => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></label>
      <label>Cliente / fornecedor<select disabled={position} value={filters.contact} onChange={e => change('contact', e.target.value)}><option value="">Todos</option>{data.contacts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      {kind === 'receivables' ? <label>Situação<select value={filters.status} onChange={e => change('status', e.target.value)}><option value="">Todas</option><option value="pending">A receber</option><option value="late">Vencidas</option><option value="paid">Pagas</option></select></label> : null}
    </div></section>
    {invalid && !position ? <p className="notice error" role="alert">A data inicial deve ser anterior ou igual à final.</p> : <section className="panel"><div className="panel-heading"><div><h2>{report.title}</h2><p role="status">{report.rows.length} registros encontrados</p></div></div>{report.notes.map(note => <p className="notice" key={note}>{note}</p>)}<FinanceTable headers={report.columns.map(c => c.label)} empty={!report.rows.length ? 'Nenhum registro na seleção' : undefined}>{report.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{reportCell(cell, report.columns[j])}</td>)}</tr>)}</FinanceTable></section>}
    {kind === 'suppliers' && !invalid ? <section className="panel"><div className="panel-heading"><div><h2>Pagamentos e estornos do fornecedor</h2><p>Por data da movimentação · os filtros de período, pessoa e imóvel também se aplicam aqui.</p></div><ReportExport report={statementReport(data, filters)} /></div><LedgerTable entries={filterLedger(data, filters)} data={data} /></section> : null}
  </>
}

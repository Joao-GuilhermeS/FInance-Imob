import { useEffect, useId, useRef, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { dateLabel, money } from '../lib/domain'
import type { CashBucket } from '../lib/dashboard'

const compact = (cents: number) => new Intl.NumberFormat('pt-BR', Math.abs(cents) < 1000 ? { maximumFractionDigits: 2 } : { notation: 'compact', maximumFractionDigits: 1 }).format(cents / 100)
const signed = (cents: number) => `${cents >= 0 ? '+' : '−'} ${money(Math.abs(cents))}`

function VolumeBar({ x, y, width, height, gradient, negative = false }: { x: number; y: number; width: number; height: number; gradient: string; negative?: boolean }) {
  if (!height) return null
  const depth = Math.min(3, width * .22)
  const offset = negative ? depth : -depth
  const cap = negative ? y + height : y
  return <g className={`bar-volume ${negative ? 'volume-outcome' : 'volume-income'}`} aria-hidden="true">
    <polygon points={`${x + width},${y} ${x + width + depth},${y + offset} ${x + width + depth},${y + height + offset} ${x + width},${y + height}`} className="bar-side" />
    <polygon points={`${x},${cap} ${x + depth},${cap + offset} ${x + width + depth},${cap + offset} ${x + width},${cap}`} className="bar-cap" />
    <rect x={x} y={y} width={width} height={height} rx="2" fill={`url(#${gradient})`} />
    <line x1={x + 1} x2={x + width - 1} y1={y + .5} y2={y + .5} className="bar-highlight" />
  </g>
}

export function CashFlowChart({ buckets }: { buckets: CashBucket[] }) {
  const [selected, setSelected] = useState<number | null>(null)
  const id = useId().replace(/:/g, '')
  const incomeGradient = `${id}-income`, outcomeGradient = `${id}-outcome`
  const hasEntries = buckets.some(item => item.income || item.outcome)
  const canvas = useRef<HTMLDivElement>(null)
  const [canvasWidth, setCanvasWidth] = useState(760)
  useEffect(() => {
    if (!canvas.current) return
    const observer = new ResizeObserver(entries => { for (const entry of entries) setCanvasWidth(Math.max(240, Math.floor(entry.contentRect.width))) })
    observer.observe(canvas.current)
    return () => observer.disconnect()
  }, [hasEntries])
  const active = selected === null ? undefined : buckets[selected]
  const rawMax = Math.max(1, ...buckets.flatMap(item => [item.income, item.result]))
  const rawMin = Math.min(0, ...buckets.flatMap(item => [-item.outcome, item.result]))
  const roughStep = (rawMax - rawMin) / 4
  const power = 10 ** Math.floor(Math.log10(roughStep))
  const unit = roughStep / power
  const step = Math.max(1, (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power)
  const max = Math.ceil(rawMax / step) * step, min = Math.floor(rawMin / step) * step
  const ticks = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => max - i * step)
  const scale = (value: number) => 20 + (max - value) / (max - min) * 188
  const baseline = scale(0)
  const width = (canvasWidth - 90) / Math.max(buckets.length, 1)
  const bar = Math.min(20, width * .26)
  const labelStep = Math.max(1, Math.ceil((buckets.length - 1) / Math.max(1, Math.floor((canvasWidth - 90) / 68) - 1)))
  const tooltipLeft = Math.max(12, Math.min(canvasWidth - 252, 65 + (selected ?? 0) * width - 90))

  return <section className="panel chart-panel bento-chart bento-surface" aria-label="Fluxo de caixa">
    <div className="panel-heading"><div><h2>Fluxo de caixa</h2><p>Entradas, saídas e resultado no período</p></div><span className="bento-live"><i aria-hidden="true" />Realizado</span></div>
    <div className="chart-legend"><span className="chart-unit">Valores em R$</span><span><i className="legend-dot revenue" />+ Entradas</span><span><i className="legend-dot expense" />− Saídas</span><span><i className="legend-dot result" />Resultado</span></div>
    {!hasEntries ? <div className="chart-empty"><BarChart3 size={30} aria-hidden="true" /><strong>Sem movimentações neste período</strong><p>Os lançamentos confirmados aparecerão aqui.</p></div> : <div className="cash-chart">
      <div className="chart-canvas" ref={canvas}>
        <svg viewBox={`0 0 ${canvasWidth} 250`} role="group" aria-label="Gráfico de fluxo de caixa. Consulte os valores por intervalo com Tab ou na tabela de dados.">
          <defs>
            <linearGradient id={incomeGradient} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#6366F1" /><stop offset="100%" stopColor="#2563EB" /></linearGradient>
            <linearGradient id={outcomeGradient} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#94A3B8" /><stop offset="100%" stopColor="#4F46E5" /></linearGradient>
          </defs>
          {ticks.map(value => <g key={value}><line x1="60" x2={canvasWidth - 20} y1={scale(value)} y2={scale(value)} className="chart-gridline" /><text x="48" y={scale(value) + 4} textAnchor="end" className="chart-axis">{compact(value)}</text></g>)}
          <line x1="60" x2={canvasWidth - 20} y1={baseline} y2={baseline} className="chart-baseline" />
          {buckets.map((item, index) => {
            const x = 65 + index * width
            return <g key={item.from} tabIndex={0} role="img" aria-label={`${dateLabel(item.from)} a ${dateLabel(item.to)}: entradas ${money(item.income)}, saídas ${money(item.outcome)}, resultado ${money(item.result)}`} onPointerEnter={event => { if (event.pointerType === 'mouse') setSelected(index) }} onPointerLeave={event => { if (event.pointerType === 'mouse' && document.activeElement !== event.currentTarget) setSelected(null) }} onFocus={() => setSelected(index)} onBlur={() => setSelected(null)} className={`chart-group${selected === index ? ' is-selected' : ''}`} onClick={() => setSelected(index)} onKeyDown={event => { if (event.key === 'Escape') setSelected(null); if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(index) } }}>
              <rect x={x - 4} y="12" width={width - 4} height="204" fill="transparent" />
              <VolumeBar x={x} y={scale(item.income)} width={bar} height={Math.max(item.income ? 1 : 0, baseline - scale(item.income))} gradient={incomeGradient} />
              <VolumeBar x={x + bar + 4} y={baseline} width={bar} height={Math.max(item.outcome ? 1 : 0, scale(-item.outcome) - baseline)} gradient={outcomeGradient} negative />
              {(index === buckets.length - 1 || index % labelStep === 0 && index < buckets.length - 1 - labelStep / 2) ? <text x={x + bar} y="237" textAnchor="middle" className="chart-axis">{item.label}</text> : null}
            </g>
          })}
          <polyline points={buckets.map((item, index) => `${65 + index * width + bar},${scale(item.result)}`).join(' ')} className="chart-result-line" />
          {buckets.map((item, index) => <circle key={item.from} cx={65 + index * width + bar} cy={scale(item.result)} r={selected === index ? 5 : 3} className="chart-result-dot" />)}
        </svg>
        {active ? <div className="bento-tooltip" style={{ left: tooltipLeft }} role="status"><strong>{dateLabel(active.from)} - {dateLabel(active.to)}</strong><dl><div><dt>+ Entradas</dt><dd>{money(active.income)}</dd></div><div><dt>− Saídas</dt><dd>{money(active.outcome)}</dd></div><div><dt>Resultado</dt><dd>{signed(active.result)}</dd></div></dl></div> : null}
      </div>
      <p className="chart-interaction-hint">Selecione um intervalo com mouse, toque ou teclado para ver os valores.</p>
    </div>}
    <details className="chart-data"><summary>Ver dados do gráfico</summary><div className="table-wrap"><table><thead><tr><th scope="col">Intervalo</th><th scope="col">+ Entradas</th><th scope="col">− Saídas</th><th scope="col">Resultado</th></tr></thead><tbody>{buckets.map(item => <tr key={item.from}><td>{dateLabel(item.from)} - {dateLabel(item.to)}</td><td>{signed(item.income)}</td><td>− {money(item.outcome)}</td><td>{signed(item.result)}</td></tr>)}</tbody></table></div></details>
  </section>
}

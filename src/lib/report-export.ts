import { dateLabel, money } from './domain'
import { downloadCsv } from './financial'

export type ReportColumn = { label: string; kind?: 'money' | 'date' | 'number' }
export type Report = { title: string; notes: string[]; columns: ReportColumn[]; rows: (string | number)[][] }
export function reportCell(value: string | number, column: ReportColumn) {
  return column.kind === 'money' && typeof value === 'number' ? money(value) : column.kind === 'date' && value ? dateLabel(String(value)) : String(value)
}
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export async function exportReport(report: Report, format: 'csv' | 'pdf' | 'xlsx') {
  const filename = report.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  const stamp = new Date().toLocaleString('pt-BR')
  if (format === 'csv') {
    downloadCsv(`${filename}.csv`, [[report.title], ...report.notes.map(note => [note]), ['Emitido em', stamp], [], report.columns.map(column => column.label), ...report.rows.map(row => row.map((value, i) => report.columns[i].kind === 'money' && typeof value === 'number' ? (value / 100).toFixed(2).replace('.', ',') : value))])
  } else if (format === 'xlsx') {
    const { default: ExcelJS } = await import('exceljs')
    const book = new ExcelJS.Workbook(); book.creator = 'Finance Imob'; book.created = new Date()
    const sheet = book.addWorksheet('Relatório', { views: [{ state: 'frozen', ySplit: report.notes.length + 4 }] })
    sheet.addRow([report.title]); report.notes.forEach(note => sheet.addRow([note])); sheet.addRow([`Emitido em ${stamp}`]); sheet.addRow([])
    const header = sheet.addRow(report.columns.map(column => column.label)); header.font = { bold: true, color: { argb: 'FFFFFFFF' } }; header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF18181B' } }
    sheet.autoFilter = { from: { row: header.number, column: 1 }, to: { row: header.number, column: report.columns.length } }
    report.rows.forEach(row => {
      const result = sheet.addRow(row.map((value, i) => report.columns[i].kind === 'money' && typeof value === 'number' ? value / 100 : value))
      report.columns.forEach((column, i) => { if (column.kind === 'money') result.getCell(i + 1).numFmt = '"R$" #,##0.00;[Red]-"R$" #,##0.00' })
    })
    sheet.columns.forEach((column, i) => { column.width = report.columns[i]?.kind === 'money' ? 22 : 30 })
    const buffer = await book.xlsx.writeBuffer()
    saveBlob(new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${filename}.xlsx`)
  } else {
    const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
    const doc = new jsPDF({ orientation: report.columns.length > 5 ? 'landscape' : 'portrait' })
    const width = doc.internal.pageSize.getWidth()
    doc.setFontSize(17); doc.text('Finance Imob', 14, 17)
    doc.setFontSize(12); doc.text(report.title, 14, 25)
    doc.setFontSize(8)
    const lines = doc.splitTextToSize([...report.notes, `Emitido em ${stamp}`].join('\n'), width - 28) as string[]
    doc.text(lines, 14, 32)
    autoTable(doc, { startY: 35 + lines.length * 4, head: [report.columns.map(column => column.label)], body: report.rows.map(row => row.map((value, i) => reportCell(value, report.columns[i]))), styles: { fontSize: 8, overflow: 'linebreak', cellPadding: 2.5 }, headStyles: { fillColor: [24, 24, 27] }, margin: { bottom: 16 }, horizontalPageBreak: true })
    const count = doc.getNumberOfPages()
    for (let page = 1; page <= count; page++) { doc.setPage(page); doc.setFontSize(8); doc.text(`Finance Imob · ${page}/${count}`, 14, doc.internal.pageSize.getHeight() - 7) }
    doc.save(`${filename}.pdf`)
  }
}

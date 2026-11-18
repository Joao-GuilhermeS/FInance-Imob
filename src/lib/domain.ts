export const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents || 0) / 100)
export const dateLabel = (date: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(`${date.slice(0, 10)}T12:00:00`))
export const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date())
export function cents(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error('Informe um valor positivo com até duas casas decimais.')
  const [whole, fraction = ''] = value.split('.')
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(result) || result > 1_000_000_000_000) throw new Error('Valor fora do limite permitido.')
  return result
}
export function installmentState(amount: number, received: number, due: string, reference = today(), status = 'active', saleStatus = 'active') {
  if (status === 'cancelled' || saleStatus === 'cancelled') return { label: 'Cancelada', tone: 'neutral' }
  if (status === 'renegotiated') return { label: 'Renegociada', tone: 'neutral' }
  if (received >= amount) return { label: 'Paga', tone: 'success' }
  if (due < reference) return { label: received > 0 ? 'Parcial · atrasada' : 'Atrasada', tone: 'danger' }
  if (received > 0) return { label: 'Paga parcialmente', tone: 'warning' }
  return due === reference ? { label: 'Vence hoje', tone: 'warning' } : { label: 'A vencer', tone: 'neutral' }
}
export type Role = 'admin' | 'finance' | 'sales' | 'works'
export type Contact = { id: string; name: string; document: string; phone: string; email: string; address: string; kind: string; rg?: string; birth_date?: string | null; marital_status?: string; profession?: string; whatsapp?: string; notes?: string }
export type Property = { id: string; code: string; name: string; kind: string; address: string; acquisition_cents: number; asking_cents: number; commercial_status: string; construction_status: string; budget_cents: number; development?: string; block?: string; lot?: string; area_sqm?: number | null; acquisition_on?: string | null; construction_reference?: string; responsible?: string; started_on?: string | null; expected_completion_on?: string | null; completed_on?: string | null; notes?: string }
export type Sale = { id: string; contact_id: string; property_id: string; total_cents: number; sold_on: string; contacts: { name: string }; properties: { name: string; code: string }; status?: 'active' | 'cancelled'; schedule_version?: number; cancelled_at?: string | null; cancellation_reason?: string; agreed_refund_cents?: number }
export type Installment = { id: string; sale_id: string; number: number; amount_cents: number; due_on: string; received_cents: number; client_name: string; property_code: string; status?: 'active' | 'renegotiated' | 'cancelled'; sale_status?: string; schedule_version?: number; closed_reason?: string; outstanding_cents?: number }
export type Account = { id: string; name: string; opening_cents: number }
export type Entry = { id: string; account_id: string; property_id: string | null; installment_id: string | null; expense_id: string | null; amount_cents: number; occurred_on: string; description: string; category: string; method: string; reversal_of: string | null; contact_id?: string | null; notes?: string }
export type Expense = { id: string; property_id: string | null; contact_id: string | null; description: string; category: string; amount_cents: number; due_on: string; quantity: number; unit: string; paid_cents: number; refund_sale_id?: string | null; purchased_on?: string | null; notes?: string; classification?: string; created_by?: string | null; opening_paid_cents?: number }
export type Reservation = { id: string; property_id: string; contact_id: string; expires_on: string; status: string; effective_status: string; notes: string; client_name: string; property_code: string; property_name: string; sale_id: string | null; created_at: string }
export type CommercialEvent = { id: string; kind: string; property_id: string; sale_id: string | null; reservation_id: string | null; reason: string; details: Record<string, unknown>; created_at: string }
export type Profile = { id: string; name: string; role: Role; alert_days: number; active: boolean }
export type Data = { contacts: Contact[]; properties: Property[]; sales: Sale[]; installments: Installment[]; accounts: Account[]; ledger: Entry[]; expenses: Expense[]; reservations?: Reservation[]; commercialEvents?: CommercialEvent[] }
export const emptyData: Data = { contacts: [], properties: [], sales: [], installments: [], accounts: [], ledger: [], expenses: [], reservations: [], commercialEvents: [] }
export function installmentOutstanding(item: Installment) {
  if (item.status === 'cancelled' || item.status === 'renegotiated' || item.sale_status === 'cancelled') return 0
  return item.outstanding_cents ?? Math.max(item.amount_cents - item.received_cents, 0)
}
export const installmentLabel = (item: Installment, reference = today()) => installmentState(item.amount_cents, item.received_cents, item.due_on, reference, item.status, item.sale_status)
export const roleNames: Record<Role, string> = { admin: 'Administrador', finance: 'Financeiro', sales: 'Vendas', works: 'Obras' }

import { supabase } from './supabase'
import { emptyData } from './domain'
import type { Data, Role } from './domain'
export function check(error: { message: string } | null) { if (error) throw new Error(error.message) }
export async function rpc(name: string, values: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(name, values)
  check(error); return data
}
async function rows(table: string, select = '*') {
  const result: unknown[] = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from(table).select(select).order('id').range(offset, offset + 499)
    check(error); result.push(...(data || []))
    if (!data || data.length < 500) return result
  }
}
export async function loadData(role: Role): Promise<Data> {
  const finance = role === 'admin' || role === 'finance'
  const sales = finance || role === 'sales'
  const works = finance || role === 'works'
  const requests: [keyof Data, string, string?][] = [['contacts', 'contacts'], ['properties', 'property_availability']]
  if (sales) requests.push(['sales', 'sales', '*,contacts(name),properties(name,code)'], ['reservations', 'reservation_overview'], ['commercialEvents', 'commercial_events'])
  if (finance) requests.push(['accounts', 'accounts'], ['ledger', 'ledger'], ['installments', 'installment_balances'])
  if (works) requests.push(['expenses', 'expense_balances'])
  const results = await Promise.all(requests.map(async ([key, table, select]) => [key, await rows(table, select)]))
  const data = { ...emptyData, ...Object.fromEntries(results) } as Data
  data.properties = data.properties.map(property => ({ ...property, commercial_status: (property as typeof property & { effective_status?: string }).effective_status || property.commercial_status }))
  return data
}

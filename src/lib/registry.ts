import { cents, today } from './domain'
import type { Contact, Property, Role } from './domain'
import { FieldErrors } from './form-errors'
type Values = Record<string, string>
export const contactKinds: Record<string, string> = { client: 'Cliente', supplier: 'Fornecedor', provider: 'Prestador' }
export const maritalStatuses: Record<string, string> = { single: 'Solteiro(a)', married: 'Casado(a)', divorced: 'Divorciado(a)', widowed: 'Viúvo(a)', union: 'União estável', separated: 'Separado(a)' }
export const constructionStatuses: Record<string, string> = { planning: 'Planejamento', building: 'Em construção', finishing: 'Acabamento', completed: 'Concluída' }
export const canEditContact = (role: Role) => ['admin', 'finance', 'sales'].includes(role)
export const canCreateProperty = (role: Role) => ['admin', 'sales'].includes(role)
export const canEditProperty = (role: Role) => ['admin', 'sales', 'works'].includes(role)
const text = (values: Values, name: string) => (values[name] || '').trim()
function optionalDate(value: string, field: string, errors: Record<string, string>) {
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T12:00:00Z`)) || new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) !== value) {
    errors[field] = 'Informe uma data válida.'
  }
  return value
}
export function contactPayload(values: Values, role: Role, existing?: Contact, hasSales = false) {
  if (existing && !canEditContact(role)) throw new Error('Seu perfil não permite editar pessoas.')
  const errors: Record<string, string> = {}
  const kind = text(values, 'kind')
  const name = text(values, 'name')
  const document = text(values, 'document').replace(/[\s./-]/g, '').toUpperCase()
  const birth = optionalDate(text(values, 'birth_date'), 'birth_date', errors)
  if (name.length < 2 || name.length > 160) errors.name = 'Use um nome com 2 a 160 caracteres.'
  if (!(kind in contactKinds) || role === 'works' && kind === 'client') errors.kind = 'Selecione um tipo de cadastro permitido para seu perfil.'
  if (existing?.kind === 'client' && hasSales && kind !== 'client') errors.kind = 'Um cliente com venda vinculada deve continuar como cliente.'
  if (document && !/^(\d{11}|[A-Z0-9]{12}\d{2})$/.test(document)) errors.document = 'Informe CPF com 11 dígitos ou CNPJ com 14 caracteres.'
  if (birth && birth > today()) errors.birth_date = 'A data de nascimento não pode estar no futuro.'
  const marital = text(values, 'marital_status')
  if (marital && !(marital in maritalStatuses)) errors.marital_status = 'Selecione um estado civil válido.'
  const email = text(values, 'email').toLowerCase()
  if (email.length > 254 || email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Informe um e-mail válido com até 254 caracteres.'
  for (const [field, max] of [['rg', 40], ['phone', 40], ['whatsapp', 40], ['profession', 160], ['address', 500], ['notes', 2000]] as const) {
    if (text(values, field).length > max) errors[field] = `Use no máximo ${max} caracteres.`
  }
  if (Object.keys(errors).length) throw new FieldErrors(errors)
  return { name, kind, document, rg: text(values, 'rg'), birth_date: birth, marital_status: marital, profession: text(values, 'profession'),
    phone: text(values, 'phone'), whatsapp: text(values, 'whatsapp'), email, address: text(values, 'address'), notes: text(values, 'notes') }
}
export function propertyPayload(values: Values, role: Role, existing?: Property) {
  if (!existing && !canCreateProperty(role) || existing && !canEditProperty(role)) throw new Error('Seu perfil não permite esta operação no imóvel.')
  const errors: Record<string, string> = {}
  const works = role === 'works'
  const dates = Object.fromEntries(['acquisition_on', 'started_on', 'expected_completion_on', 'completed_on'].map(field => [field, optionalDate(text(values, field), field, errors)]))
  if (dates.acquisition_on && dates.acquisition_on > today()) errors.acquisition_on = 'A data de aquisição não pode estar no futuro.'
  if (dates.started_on && dates.expected_completion_on && dates.expected_completion_on < dates.started_on) errors.expected_completion_on = 'A previsão deve ser igual ou posterior ao início da obra.'
  if (dates.started_on && dates.completed_on && dates.completed_on < dates.started_on) errors.completed_on = 'A conclusão deve ser igual ou posterior ao início da obra.'
  if (dates.completed_on && dates.completed_on > today()) errors.completed_on = 'A conclusão efetiva não pode estar no futuro.'
  const status = text(values, 'construction_status') || existing?.construction_status || 'planning'
  if (!(status in constructionStatuses)) errors.construction_status = 'Selecione uma etapa válida.'
  let budget = 0; let asking = 0; let acquisition = 0
  for (const field of works ? ['budget_cents'] : existing ? ['budget_cents', 'asking_cents'] : ['budget_cents', 'asking_cents', 'acquisition_cents']) {
    try {
      const value = cents(text(values, field) || '0')
      if (field === 'budget_cents') budget = value
      if (field === 'asking_cents') asking = value
      if (field === 'acquisition_cents') acquisition = value
    } catch { errors[field] = 'Informe um valor válido com até duas casas decimais.' }
  }
  for (const [field, max] of [['development', 160], ['block', 40], ['lot', 40], ['construction_reference', 100], ['responsible', 160], ['notes', 2000]] as const) {
    if (text(values, field).length > max) errors[field] = `Use no máximo ${max} caracteres.`
  }
  const areaText = text(values, 'area_sqm')
  const area = areaText ? Number(areaText) : null
  if (!works && areaText && (!/^\d+(\.\d{1,2})?$/.test(areaText) || !Number.isFinite(area) || area! <= 0 || area! >= 10_000_000_000)) errors.area_sqm = 'Informe uma metragem positiva com até duas casas decimais.'
  if (!works && (text(values, 'name').length < 2 || text(values, 'name').length > 160)) errors.name = 'Use um nome com 2 a 160 caracteres.'
  if (!works && text(values, 'address').length > 500) errors.address = 'Use no máximo 500 caracteres.'
  if (!existing && (text(values, 'code').length < 1 || text(values, 'code').length > 40)) errors.code = 'Use um código com até 40 caracteres.'
  if (!existing && !['land', 'house'].includes(values.kind)) errors.kind = 'Selecione terreno ou casa.'
  if (Object.keys(errors).length) throw new FieldErrors(errors)
  const construction = { construction_reference: text(values, 'construction_reference'), responsible: text(values, 'responsible'),
    started_on: dates.started_on, expected_completion_on: dates.expected_completion_on, completed_on: dates.completed_on,
    construction_status: status, budget_cents: budget, notes: text(values, 'notes') }
  if (works) return construction
  const details = { ...construction, name: text(values, 'name'), address: text(values, 'address'), development: text(values, 'development'),
    block: text(values, 'block'), lot: text(values, 'lot'), area_sqm: area, acquisition_on: dates.acquisition_on, asking_cents: asking }
  return existing ? details : { ...details, code: text(values, 'code'), kind: values.kind, acquisition_cents: acquisition }
}

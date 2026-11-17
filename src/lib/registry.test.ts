import { describe, expect, it } from 'vitest'
import { contactPayload, propertyPayload } from './registry'
import { FieldErrors } from './form-errors'
import type { Contact, Property } from './domain'
const contact: Contact = { id: 'person', name: 'Ana', kind: 'client', document: '', email: '', phone: '', address: '' }
const property: Property = { id: 'property', code: 'C01', kind: 'house', name: 'Casa 01', address: '', acquisition_cents: 10000, asking_cents: 20000, budget_cents: 50000, commercial_status: 'sold', construction_status: 'building' }
const personValues = { name: '  Ana Souza  ', kind: 'client', document: '123.456.789-01', rg: 'RG 123', birth_date: '1990-06-15', marital_status: 'single', profession: ' Engenheira ', phone: '11 2222-3333', whatsapp: '11 99999-9999', email: ' ANA@EXAMPLE.COM ', address: ' Rua A, 20 ', notes: ' Observação ' }
const propertyValues = { code: 'C02', name: ' Casa Jardim ', kind: 'house', address: 'Rua B', development: 'Jardim', block: 'A', lot: '12', area_sqm: '125.50', acquisition_on: '2026-01-10', acquisition_cents: '100.29', asking_cents: '200.50', construction_reference: 'OBRA-1', responsible: 'Maria', started_on: '2026-02-01', expected_completion_on: '2026-12-01', completed_on: '', construction_status: 'building', budget_cents: '500.10', notes: 'Detalhes' }
function invalidField(action: () => unknown, field: string) {
  try { action(); throw new Error('A validação deveria rejeitar o valor.') }
  catch (error) { expect(error).toBeInstanceOf(FieldErrors); expect((error as FieldErrors).fields[field]).toBeTruthy() }
}
describe('cadastro de pessoas', () => {
  it('normaliza texto e documento, preservando dados pessoais e canais separados', () => {
    const payload = contactPayload(personValues, 'admin')
    expect(payload.name).toBe('Ana Souza'); expect(payload.document).toBe('12345678901')
    expect(payload.email).toBe('ana@example.com'); expect(payload.whatsapp).toBe('11 99999-9999')
    expect(payload.birth_date).toBe('1990-06-15'); expect(payload.profession).toBe('Engenheira')
  })
  it('mantém campos opcionais vazios e permite CNPJ alfanumérico no formato esperado', () => {
    expect(contactPayload({ name: 'Fornecedor', kind: 'supplier' }, 'works').birth_date).toBeNull()
    expect(contactPayload({ name: 'Empresa', kind: 'supplier', document: '12.ABC.345/01DE-35' }, 'admin').document).toBe('12ABC34501DE35')
  })
  it('rejeita formato de documento, estado civil, e-mail e datas impossíveis', () => {
    invalidField(() => contactPayload({ ...personValues, document: '123' }, 'admin'), 'document')
    invalidField(() => contactPayload({ ...personValues, birth_date: '2026-02-30' }, 'admin'), 'birth_date')
    invalidField(() => contactPayload({ ...personValues, birth_date: '2099-01-01' }, 'admin'), 'birth_date')
    invalidField(() => contactPayload({ ...personValues, marital_status: 'outro' }, 'admin'), 'marital_status')
    invalidField(() => contactPayload({ ...personValues, email: 'inválido' }, 'admin'), 'email')
  })
  it('impede reclassificação de cliente vendido e edição por Obras', () => {
    invalidField(() => contactPayload({ ...personValues, kind: 'supplier' }, 'sales', contact, true), 'kind')
    expect(() => contactPayload(personValues, 'works', contact)).toThrow('não permite editar')
    invalidField(() => contactPayload(personValues, 'works'), 'kind')
  })
})
describe('cadastro e edição de imóveis', () => {
  it('converte valores e metragem, incluindo datas e identificação da obra', () => {
    const payload = propertyPayload(propertyValues, 'admin')
    expect(payload).toMatchObject({ code: 'C02', kind: 'house', acquisition_cents: 10029, asking_cents: 20050, budget_cents: 50010, area_sqm: 125.5, completed_on: null, responsible: 'Maria' })
  })
  it('exclui código, tipo, custo de aquisição e situação comercial na edição', () => {
    const payload = propertyPayload({ ...propertyValues, code: 'HACK', kind: 'land', acquisition_cents: '9999', commercial_status: 'available' }, 'sales', property)
    for (const field of ['code', 'kind', 'acquisition_cents', 'commercial_status', 'id']) expect(payload).not.toHaveProperty(field)
    expect(payload).toMatchObject({ asking_cents: 20050, block: 'A', lot: '12' })
  })
  it('limita Obras aos dados de construção e bloqueia Financeiro na edição', () => {
    const payload = propertyPayload(propertyValues, 'works', property)
    expect(payload).toMatchObject({ responsible: 'Maria', construction_status: 'building', budget_cents: 50010 })
    for (const field of ['name', 'asking_cents', 'development', 'area_sqm', 'acquisition_on']) expect(payload).not.toHaveProperty(field)
    expect(() => propertyPayload(propertyValues, 'finance', property)).toThrow('não permite')
    expect(() => propertyPayload(propertyValues, 'works')).toThrow('não permite')
  })
  it('valida metragem, datas e precisão monetária', () => {
    invalidField(() => propertyPayload({ ...propertyValues, area_sqm: '0' }, 'admin'), 'area_sqm')
    invalidField(() => propertyPayload({ ...propertyValues, area_sqm: '120.001' }, 'admin'), 'area_sqm')
    invalidField(() => propertyPayload({ ...propertyValues, expected_completion_on: '2026-01-01' }, 'admin'), 'expected_completion_on')
    invalidField(() => propertyPayload({ ...propertyValues, completed_on: '2026-01-01' }, 'admin'), 'completed_on')
    invalidField(() => propertyPayload({ ...propertyValues, completed_on: '2099-01-01' }, 'admin'), 'completed_on')
    invalidField(() => propertyPayload({ ...propertyValues, acquisition_cents: '1.001' }, 'admin'), 'acquisition_cents')
  })
})

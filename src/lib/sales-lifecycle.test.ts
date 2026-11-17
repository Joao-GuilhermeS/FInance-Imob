import { describe, expect, it } from 'vitest'
import { cancellationValues, renegotiationValues, schedulePreview } from './sales-lifecycle'
import { installmentLabel, installmentOutstanding } from './domain'

describe('acordos comerciais', () => {
  it('preserva centavos e vencimentos no fim do mês sem acumular deslocamento', () => {
    const schedule = schedulePreview(9001, 3, '2027-01-31')
    expect(schedule.map(item => item.amount)).toEqual([3000, 3000, 3001])
    expect(schedule.map(item => item.due)).toEqual(['2027-01-31', '2027-02-28', '2027-03-31'])
    expect(() => schedulePreview(100, 3, '2027-02-30')).toThrow()
  })
  it('exige devolução explícita, dentro do recebido, com confirmação do acordo', () => {
    const values = { refund: '10.01', due: '2027-01-01', reason: 'Acordo entre as partes', confirm: 'yes' }
    expect(cancellationValues(values, 1500).refund).toBe(1001)
    expect(cancellationValues({ ...values, refund: '0' }, 1500).refund).toBe(0)
    for (const refund of ['', '-1', '15.01', '1.001']) expect(() => cancellationValues({ ...values, refund }, 1500)).toThrow()
    expect(() => cancellationValues({ ...values, confirm: '' }, 1500)).toThrow()
  })
  it('rejeita vencimento passado ou parcelas acima do saldo', () => {
    expect(() => renegotiationValues({ count: '3', first: '2000-01-01', reason: 'Acordo válido' }, 9001)).toThrow()
    expect(() => schedulePreview(2, 3, '2027-01-01')).toThrow()
  })
  it('retira parcelas substituídas e canceladas da cobrança, preservando o estado histórico', () => {
    const item = { id: 'i', sale_id: 's', number: 1, amount_cents: 10000, received_cents: 1000, due_on: '2020-01-01', client_name: 'Ana', property_code: 'C01' }
    expect(installmentOutstanding(item)).toBe(9000)
    expect(installmentOutstanding({ ...item, status: 'renegotiated' })).toBe(0)
    expect(installmentOutstanding({ ...item, sale_status: 'cancelled' })).toBe(0)
    expect(installmentLabel({ ...item, status: 'renegotiated' }).label).toMatch(/Renegociada/i)
  })
})

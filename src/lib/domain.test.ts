import { describe, expect, it } from 'vitest'
import { cents, installmentState } from './domain'
describe('valores financeiros', () => {
  it('converte valores sem erro de ponto flutuante', () => {
    expect(cents('0.29')).toBe(29)
    expect(cents('1234.5')).toBe(123450)
    expect(cents('0')).toBe(0)
  })
  it('rejeita precisão excessiva, negativos e valores inválidos', () => {
    for (const value of ['-1', '1.001', 'NaN', '', 'Infinity', '10000000001']) expect(() => cents(value)).toThrow()
  })
})
describe('situação das parcelas', () => {
  it('mantém o atraso de uma parcela parcialmente paga', () => {
    expect(installmentState(10000, 5000, '2026-11-01', '2026-11-14').label).toBe('Parcial · atrasada')
  })
  it('identifica quitação e vencimento do dia', () => {
    expect(installmentState(10000, 10000, '2026-11-01', '2026-11-14').label).toBe('Paga')
    expect(installmentState(10000, 0, '2026-11-14', '2026-11-14').label).toBe('Vence hoje')
  })
})

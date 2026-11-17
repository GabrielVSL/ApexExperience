import { describe, it, expect, beforeEach } from 'vitest';
import { useCurrencyStore } from './useCurrencyStore';

describe('useCurrencyStore', () => {
  beforeEach(() => {
    useCurrencyStore.setState({
      currency: 'BRL',
      eurRate: 6.0,
      brlRates: { EUR: 1 / 6.0, GBP: 1 / 7.2, JPY: 25 },
    });
  });

  it('formata valor em BRL por padrão com R$ e duas casas decimais', () => {
    const formatted = useCurrencyStore.getState().formatPrice(6000);
    expect(formatted).toBe('R$ 6.000,00');
  });

  it('alterna para EUR e formata sem casas decimais fracionadas', () => {
    useCurrencyStore.getState().setCurrency('EUR');
    const formatted = useCurrencyStore.getState().formatPrice(6000);
    expect(formatted).toBe('€ 1.000');
  });

  it('converte automaticamente para moeda local apenas em pistas fora do Brasil', () => {
    expect(useCurrencyStore.getState().formatCircuitEquivalent(6000, 'interlagos')).toBeNull();
    expect(useCurrencyStore.getState().formatCircuitEquivalent(6000, 'nurburgring')).toEqual({
      code: 'EUR',
      label: 'Euro',
      formatted: '€ 1.000',
    });
  });

  it('retorna traço para valores indefinidos ou nulos', () => {
    expect(useCurrencyStore.getState().formatPrice(undefined)).toBe('—');
    expect(useCurrencyStore.getState().formatPrice(null)).toBe('—');
  });
});

import { create } from 'zustand';
import { BrlExchangeRates, getBrlExchangeRates } from '@/services/telemetryService';

export type Currency = 'BRL' | 'EUR';

export interface ForeignCurrencyEquivalent {
  code: 'EUR' | 'GBP' | 'JPY';
  label: string;
  formatted: string;
}

interface CurrencyStore {
  currency: Currency;
  eurRate: number; // 1 EUR = X BRL
  brlRates: BrlExchangeRates;
  setCurrency: (currency: Currency) => void;
  formatPrice: (valBrl: number | undefined | null) => string;
  formatBrl: (valBrl: number | undefined | null) => string;
  formatCircuitEquivalent: (
    valBrl: number | undefined | null,
    circuitId?: string | null
  ) => ForeignCurrencyEquivalent | null;
  initRate: () => Promise<void>;
}

const DEFAULT_BRL_RATES: BrlExchangeRates = {
  EUR: 1 / 6.15,
  GBP: 1 / 7.35,
  JPY: 25.5,
};

export const useCurrencyStore = create<CurrencyStore>((set, get) => ({
  currency: 'BRL', // Padrão brasileiro (valores salvos em Reais no backend)
  eurRate: 6.15,
  brlRates: DEFAULT_BRL_RATES,
  setCurrency: (currency) => set({ currency }),
  initRate: async () => {
    try {
      const rates = await getBrlExchangeRates();
      set({
        brlRates: rates,
        eurRate: rates.EUR > 0 ? Number((1 / rates.EUR).toFixed(2)) : 6.15,
      });
    } catch {
      // mantém padrão
    }
  },
  formatBrl: (valBrl) => {
    if (valBrl === undefined || valBrl === null || isNaN(valBrl)) return '—';
    return `R$ ${valBrl.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  },
  formatPrice: (valBrl) => {
    if (valBrl === undefined || valBrl === null || isNaN(valBrl)) return '—';
    const { currency, eurRate } = get();
    if (currency === 'EUR') {
      const eurVal = valBrl / (eurRate || 6.15);
      return `€ ${eurVal.toLocaleString('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;
    }
    return `R$ ${valBrl.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  },
  formatCircuitEquivalent: (valBrl, circuitId) => {
    if (valBrl === undefined || valBrl === null || isNaN(valBrl) || valBrl === 0) {
      return null;
    }
    if (!circuitId || circuitId === 'interlagos') {
      return null;
    }

    const { eurRate, brlRates } = get();

    if (circuitId === 'silverstone') {
      const gbpVal = valBrl * (brlRates.GBP || DEFAULT_BRL_RATES.GBP);
      return {
        code: 'GBP',
        label: 'Libra Esterlina',
        formatted: `£ ${gbpVal.toLocaleString('pt-BR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}`,
      };
    }

    if (circuitId === 'suzuka') {
      const jpyVal = valBrl * (brlRates.JPY || DEFAULT_BRL_RATES.JPY);
      return {
        code: 'JPY',
        label: 'Iene Japonês',
        formatted: `¥ ${jpyVal.toLocaleString('pt-BR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}`,
      };
    }

    const eurVal = valBrl / (eurRate || 6.15);
    return {
      code: 'EUR',
      label: 'Euro',
      formatted: `€ ${eurVal.toLocaleString('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`,
    };
  },
}));

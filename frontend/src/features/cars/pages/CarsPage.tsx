'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2, ChevronDown, Check, Search, RotateCcw, ArrowUpRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import { CarsFilter } from '../components/CarsFilter';
import { CarCard } from '../components/CarCard';
import { BookingModal, Automovel } from '../components/BookingModal';
import { CIRCUITS } from '@/services/telemetryService';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { getCarDisplaySpecs } from '@/lib/carPresentation';
import { useCurrencyStore } from '@/store/useCurrencyStore';

const BRAND_FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'porsche', label: 'Porsche' },
  { id: 'bmw', label: 'BMW' },
  { id: 'mercedes', label: 'Mercedes-AMG' },
  { id: 'audi', label: 'Audi' },
];

const CATEGORY_FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'gt3', label: 'GT3' },
  { id: 'gt4', label: 'GT4' },
  { id: 'gt2', label: 'GT2' },
  { id: 'gt', label: 'GT / Elétrico' },
];

const POWER_FILTERS = [
  { id: 0, label: 'Qualquer' },
  { id: 500, label: '500+ cv' },
  { id: 600, label: '600+ cv' },
  { id: 700, label: '700+ cv' },
];

const PRICE_HISTOGRAM_BARS = [18, 28, 36, 46, 58, 72, 86, 98];

const CIRCUIT_COUNTRY_CODES: Record<string, string> = {
  nurburgring: 'DE',
  spa: 'BE',
  monza: 'IT',
  monaco: 'MC',
  le_mans: 'FR',
  silverstone: 'GB',
  interlagos: 'BR',
  suzuka: 'JP',
};

const shortCircuitName = (name: string) =>
  name
    .replace('Circuit de la Sarthe ', '')
    .replace('Circuit de ', '')
    .replace('Autodromo Nazionale ', '')
    .replace('Autódromo de ', '')
    .replace(' International Racing Course', '')
    .replace(' Nordschleife', '')
    .replace(' Circuit', '');

function parsePowerCv(carro: Automovel): number {
  if (typeof carro.potenciaCv === 'number' && carro.potenciaCv > 0) {
    return carro.potenciaCv;
  }
  const specs = getCarDisplaySpecs(carro);
  const numeric = parseInt(specs.power.replace(/\D/g, ''), 10);
  return Number.isNaN(numeric) ? 0 : numeric;
}

export default function CarsPage() {
  const { formatPrice } = useCurrencyStore();
  const [carros, setCarros] = useState<Automovel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCar, setSelectedCar] = useState<Automovel | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeBrandFilter, setActiveBrandFilter] = useState<string>('all');
  const [activeCircuitFilter, setActiveCircuitFilter] = useState<string>('all');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [minPowerFilter, setMinPowerFilter] = useState<number>(0);
  const [maxPriceLimit, setMaxPriceLimit] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'power-desc'>('default');

  const [circuitDropdownOpen, setCircuitDropdownOpen] = useState(false);
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const circuitMenuRef = useRef<HTMLDivElement>(null);
  const brandMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (circuitMenuRef.current && !circuitMenuRef.current.contains(e.target as Node)) {
        setCircuitDropdownOpen(false);
      }
      if (brandMenuRef.current && !brandMenuRef.current.contains(e.target as Node)) {
        setBrandDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    const fetchCars = async () => {
      setIsLoading(true);
      try {
        let url = '/api/automoveis';
        if (selectedDate) {
          url += `?inicio=${selectedDate}T08:00:00&fim=${selectedDate}T22:00:00`;
        }
        const response = await api.get(url);
        setCarros(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Erro ao buscar carros:', error);
        setCarros([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCars();
  }, [selectedDate]);

  const priceBounds = useMemo(() => {
    const prices = carros
      .map((c) => Number(c.precoPorDia || 0))
      .filter((p) => p > 0);
    if (prices.length === 0) return { min: 1500, max: 15000 };
    const min = Math.floor(Math.min(...prices) / 500) * 500;
    const max = Math.ceil(Math.max(...prices) / 500) * 500;
    return { min, max: Math.max(max, min + 1000) };
  }, [carros]);

  const effectiveMaxPrice = maxPriceLimit ?? priceBounds.max;

  const handleOpenBooking = (car: Automovel) => {
    setSelectedCar(car);
    setIsModalOpen(true);
  };

  const handleResetFilters = () => {
    setActiveBrandFilter('all');
    setActiveCircuitFilter('all');
    setActiveCategoryFilter('all');
    setMinPowerFilter(0);
    setMaxPriceLimit(null);
    setSelectedDate('');
    setSearchQuery('');
    setSortBy('default');
  };

  const filteredCars = useMemo(() => {
    const list = carros.filter((car) => {
      if (activeBrandFilter !== 'all') {
        const brandMatch = car.marca.toLowerCase().includes(activeBrandFilter);
        if (!brandMatch) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const hay = `${car.marca} ${car.modelo} ${car.ano}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (activeCircuitFilter !== 'all') {
        if (car.circuitosDisponiveis && car.circuitosDisponiveis.length > 0) {
          const matchesCircuit = car.circuitosDisponiveis.some(
            (c) => c.id === activeCircuitFilter
          );
          if (!matchesCircuit) return false;
        } else if (car.circuito?.id) {
          if (car.circuito.id !== activeCircuitFilter) return false;
        } else {
          const specs = getCarDisplaySpecs(car);
          const circuitObj = CIRCUITS.find((c) => c.id === activeCircuitFilter);
          if (circuitObj && !circuitObj.name.toLowerCase().includes(specs.circuit.toLowerCase())) {
            return false;
          }
        }
      }

      if (activeCategoryFilter !== 'all') {
        const specs = getCarDisplaySpecs(car);
        const cat = `${car.categoria || ''} ${specs.category}`.toLowerCase();
        if (activeCategoryFilter === 'gt') {
          if (!cat.includes('elétrico') && !cat.includes('eletrico') && !cat.includes('ev') && !cat.includes('gt')) {
            return false;
          }
        } else if (!cat.includes(activeCategoryFilter)) {
          return false;
        }
      }

      if (minPowerFilter > 0) {
        if (parsePowerCv(car) < minPowerFilter) return false;
      }

      if (maxPriceLimit !== null && Number(car.precoPorDia || 0) > maxPriceLimit) {
        return false;
      }

      return true;
    });

    if (sortBy === 'price-asc') {
      return [...list].sort((a, b) => Number(a.precoPorDia || 0) - Number(b.precoPorDia || 0));
    }
    if (sortBy === 'power-desc') {
      return [...list].sort((a, b) => parsePowerCv(b) - parsePowerCv(a));
    }
    return list;
  }, [
    carros,
    activeBrandFilter,
    searchQuery,
    activeCircuitFilter,
    activeCategoryFilter,
    minPowerFilter,
    maxPriceLimit,
    sortBy,
  ]);

  const activeCircuitObj = CIRCUITS.find((c) => c.id === activeCircuitFilter);
  const activeBrandLabel =
    BRAND_FILTERS.find((b) => b.id === activeBrandFilter)?.label || 'Todas';

  const hasAnyFilter =
    activeBrandFilter !== 'all' ||
    activeCircuitFilter !== 'all' ||
    activeCategoryFilter !== 'all' ||
    minPowerFilter > 0 ||
    maxPriceLimit !== null ||
    selectedDate !== '' ||
    searchQuery.trim() !== '';

  // Percentual preenchido do slider para destacar as barras da distribuição
  const sliderRatio =
    priceBounds.max > priceBounds.min
      ? (effectiveMaxPrice - priceBounds.min) / (priceBounds.max - priceBounds.min)
      : 1;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08090C]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#FF1717]" size={30} />
          <span className="text-xs text-white/50">Carregando frota dos boxes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090C] text-white pt-28 pb-24 selection:bg-[#FF1717] selection:text-white font-sans">
      <div className="max-w-6xl mx-auto px-6">
        {/* Cabeçalho no padrão da Landing Page */}
        <header className="mb-10 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full bg-white/[0.05]">
                <span className="w-6 h-6 rounded-full bg-[#FF1717] flex items-center justify-center text-white shadow-[0_0_16px_rgba(255,23,23,0.4)]">
                  <Sparkles size={12} />
                </span>
                <span className="text-xs font-medium text-white/80">
                  Frota homologada · {carros.length} supercarros
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-medium tracking-tight text-white leading-[1.08]">
                Frota de pista{' '}
                <span className="italic font-light text-white/85">pronta no box.</span>
              </h1>
            </div>

            <p className="text-white/55 text-xs sm:text-sm max-w-md leading-relaxed">
              Combustível 102 octanas, pneus Cup 2 R e telemetria VBOX inclusos por bateria. Escolha montadora, autódromo ou data disponível.
            </p>
          </div>

          {/* Barra Superior de Busca Rápida (Inspirada na Ref. sem bordas) */}
          <div className="rounded-3xl bg-[#0D1017] p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 lg:gap-0 items-center lg:divide-x lg:divide-white/[0.07]">
              {/* Slot 1: Montadora */}
              <div className="lg:col-span-2 lg:px-4 relative" ref={brandMenuRef}>
                <span className="block text-[11px] text-white/40 mb-1">Montadora</span>
                <button
                  type="button"
                  onClick={() => setBrandDropdownOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between gap-2 text-xs sm:text-sm font-medium text-white cursor-pointer"
                >
                  <span className="truncate">{activeBrandLabel}</span>
                  <ChevronDown
                    size={14}
                    className={`text-white/40 transition-transform ${
                      brandDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {brandDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.14 }}
                      className="absolute left-0 top-full mt-4 z-50 w-52 bg-[#121622] rounded-2xl py-2 shadow-[0_24px_60px_rgba(0,0,0,0.85)]"
                    >
                      {BRAND_FILTERS.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setActiveBrandFilter(b.id);
                            setBrandDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-xs flex items-center justify-between hover:bg-white/[0.05] cursor-pointer ${
                            activeBrandFilter === b.id ? 'text-white font-medium' : 'text-white/65'
                          }`}
                        >
                          <span>{b.label}</span>
                          {activeBrandFilter === b.id && (
                            <Check size={13} className="text-[#FF1717]" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Slot 2: Autódromo */}
              <div className="lg:col-span-3 lg:px-4 relative" ref={circuitMenuRef}>
                <span className="block text-[11px] text-white/40 mb-1">Autódromo</span>
                <button
                  type="button"
                  onClick={() => setCircuitDropdownOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between gap-2 text-xs sm:text-sm font-medium text-white cursor-pointer"
                >
                  {activeCircuitObj ? (
                    <span className="flex items-center gap-2 truncate">
                      <CountryFlag
                        countryCode={CIRCUIT_COUNTRY_CODES[activeCircuitObj.id] || 'DE'}
                        className="w-4 h-3 rounded-[2px] shrink-0"
                      />
                      <span className="truncate">{shortCircuitName(activeCircuitObj.name)}</span>
                    </span>
                  ) : (
                    <span className="truncate">Todos os 8 boxes</span>
                  )}
                  <ChevronDown
                    size={14}
                    className={`text-white/40 transition-transform shrink-0 ${
                      circuitDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {circuitDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.14 }}
                      className="absolute left-0 top-full mt-4 z-50 w-72 bg-[#121622] rounded-2xl py-2 shadow-[0_24px_60px_rgba(0,0,0,0.85)]"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCircuitFilter('all');
                          setCircuitDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-xs flex items-center justify-between hover:bg-white/[0.05] cursor-pointer ${
                          activeCircuitFilter === 'all' ? 'text-white font-medium' : 'text-white/65'
                        }`}
                      >
                        <span>Todos os circuitos (8 boxes)</span>
                        {activeCircuitFilter === 'all' && (
                          <Check size={13} className="text-[#FF1717]" />
                        )}
                      </button>

                      <div className="my-1 border-t border-white/[0.06]" />

                      {CIRCUITS.map((c) => {
                        const selected = activeCircuitFilter === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setActiveCircuitFilter(c.id);
                              setCircuitDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-2 text-left text-xs flex items-center justify-between hover:bg-white/[0.05] cursor-pointer ${
                              selected ? 'text-white font-medium bg-white/[0.03]' : 'text-white/70'
                            }`}
                          >
                            <span className="flex items-center gap-2.5 truncate">
                              <CountryFlag
                                countryCode={CIRCUIT_COUNTRY_CODES[c.id] || 'DE'}
                                className="w-4 h-3 rounded-[2px] shrink-0"
                              />
                              <span className="truncate">{shortCircuitName(c.name)}</span>
                            </span>
                            <span className="text-[11px] text-white/40 ml-2 shrink-0">
                              {c.lengthKm}
                            </span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Slot 3: Buscar Modelo */}
              <div className="lg:col-span-3 lg:px-4">
                <label htmlFor="fleet-search" className="block text-[11px] text-white/40 mb-1">
                  Modelo ou ano
                </label>
                <div className="flex items-center gap-2">
                  <Search size={14} className="text-white/35 shrink-0" />
                  <input
                    id="fleet-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="GT3 RS, R8, M4..."
                    className="w-full bg-transparent text-xs sm:text-sm font-medium text-white placeholder:text-white/30 focus:outline-none"
                  />
                </div>
              </div>

              {/* Slot 4: Data da Sessão */}
              <div className="lg:col-span-2 lg:px-4">
                <span className="block text-[11px] text-white/40 mb-1">Data da sessão</span>
                <CarsFilter
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  onClear={() => setSelectedDate('')}
                />
              </div>

              {/* Botão Direito */}
              <div className="lg:col-span-2 lg:pl-4 flex justify-end">
                <Link
                  to="/pistas"
                  className="w-full lg:w-auto inline-flex items-center justify-center gap-2 bg-[#FF1717] hover:bg-[#e01414] text-white text-xs sm:text-sm font-medium px-5 py-3 rounded-2xl transition-colors shadow-[0_8px_24px_rgba(255,23,23,0.3)]"
                >
                  <span>Mapa de pistas</span>
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Layout 2 Colunas: Sidebar de Filtros à Esquerda + Grid 2x2 de Carros à Direita */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sidebar de Filtros */}
          <aside className="lg:col-span-3 rounded-3xl bg-[#0D1017] p-6 space-y-7 lg:sticky lg:top-28">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-white">Filtros</h2>
              {hasAnyFilter && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#FF1717] hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Redefinir</span>
                </button>
              )}
            </div>

            {/* Montadora */}
            <div className="space-y-2.5">
              <p className="text-xs text-white/45">Montadora</p>
              <div className="flex flex-wrap gap-1.5">
                {BRAND_FILTERS.map((brand) => {
                  const active = activeBrandFilter === brand.id;
                  return (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() => setActiveBrandFilter(brand.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#FF1717] text-white'
                          : 'bg-white/[0.05] text-white/65 hover:bg-white/[0.1] hover:text-white'
                      }`}
                    >
                      {brand.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Teto por Sessão com Mini Gráfico de Distribuição */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/45">Valor por sessão</p>
                <span className="text-xs font-medium text-white tabular-nums">
                  Até {formatPrice(effectiveMaxPrice)}
                </span>
              </div>

              {/* Histograma Visual */}
              <div className="h-12 flex items-end gap-1 pt-2">
                {PRICE_HISTOGRAM_BARS.map((height, idx) => {
                  const barThreshold = (idx + 1) / PRICE_HISTOGRAM_BARS.length;
                  const active = barThreshold <= sliderRatio + 0.08;
                  return (
                    <div
                      key={idx}
                      style={{ height: `${height}%` }}
                      className={`flex-1 rounded-t-md transition-colors duration-200 ${
                        active ? 'bg-[#FF1717]/75' : 'bg-white/[0.08]'
                      }`}
                    />
                  );
                })}
              </div>

              <input
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                step={250}
                value={effectiveMaxPrice}
                onChange={(e) => setMaxPriceLimit(Number(e.target.value))}
                className="w-full accent-[#FF1717] cursor-pointer"
                aria-label="Valor máximo por sessão"
              />

              <div className="flex items-center justify-between text-[11px] text-white/40 tabular-nums">
                <span>{formatPrice(priceBounds.min)}</span>
                <span>{formatPrice(priceBounds.max)}</span>
              </div>
            </div>

            {/* Categoria */}
            <div className="space-y-2.5">
              <p className="text-xs text-white/45">Categoria de pista</p>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_FILTERS.map((cat) => {
                  const active = activeCategoryFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'bg-white text-[#08090C]'
                          : 'bg-white/[0.05] text-white/65 hover:bg-white/[0.1] hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Potência Mínima */}
            <div className="space-y-2.5">
              <p className="text-xs text-white/45">Potência mínima</p>
              <div className="flex flex-wrap gap-1.5">
                {POWER_FILTERS.map((pwr) => {
                  const active = minPowerFilter === pwr.id;
                  return (
                    <button
                      key={pwr.id}
                      type="button"
                      onClick={() => setMinPowerFilter(pwr.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'bg-emerald-400 text-[#08090C]'
                          : 'bg-white/[0.05] text-white/65 hover:bg-white/[0.1] hover:text-white'
                      }`}
                    >
                      {pwr.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Área de Resultados */}
          <div className="lg:col-span-9 space-y-6">
            {/* Barra de Status + Ordenação */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs sm:text-sm text-white/75">
                Mostrando <span className="font-semibold text-white">{filteredCars.length}</span>{' '}
                {filteredCars.length === 1 ? 'supercarro disponível' : 'supercarros disponíveis'}
              </p>

              <div className="inline-flex items-center gap-1 p-1 rounded-full bg-[#0D1017]">
                {[
                  { id: 'default' as const, label: 'Relevância' },
                  { id: 'price-asc' as const, label: 'Menor valor' },
                  { id: 'power-desc' as const, label: 'Maior potência' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSortBy(opt.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      sortBy === opt.id
                        ? 'bg-white/[0.1] text-white'
                        : 'text-white/50 hover:text-white/85'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredCars.length === 0 ? (
              <div className="rounded-3xl bg-[#0D1017] p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <p className="text-xs font-medium text-[#FF1717] mb-1">
                    Sem resultados no box
                  </p>
                  <h3 className="text-lg font-medium text-white">
                    Nenhum supercarro disponível para essa combinação de filtros.
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="bg-white text-[#08090C] hover:bg-[#FF1717] hover:text-white px-6 py-2.5 rounded-full text-xs font-medium transition-colors cursor-pointer shrink-0"
                >
                  Redefinir filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredCars.map((carro, index) => (
                  <CarCard
                    key={carro.id}
                    carro={carro}
                    index={index}
                    onSelect={handleOpenBooking}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        car={selectedCar}
      />
    </div>
  );
}

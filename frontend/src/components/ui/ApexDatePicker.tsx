'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ApexDatePickerProps {
  value?: string; // Formato ISO "YYYY-MM-DD"
  onChange: (isoDate: string) => void;
  placeholder?: string;
  className?: string;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export const ApexDatePicker: React.FC<ApexDatePickerProps> = ({
  value = '',
  onChange,
  placeholder = 'DD/MM/AAAA',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Converte valor ISO (YYYY-MM-DD) para texto amigável (DD/MM/AAAA)
  const formatIsoToDisplay = (iso: string) => {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    return iso;
  };

  const [displayValue, setDisplayValue] = useState(formatIsoToDisplay(value));

  // Data em exibição no calendário
  const initialDate = value ? new Date(value + 'T00:00:00') : new Date(2000, 0, 1);
  const [viewYear, setViewYear] = useState(initialDate.getFullYear() || 2000);
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth() || 0);

  useEffect(() => {
    setDisplayValue(formatIsoToDisplay(value));
  }, [value]);

  // Calcula a posição fixa na viewport (evita empurrar layout ou gerar scrollbar no card)
  const updateCoords = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverWidth = 290;
    const popoverHeight = 320;
    const spaceBelow = window.innerHeight - rect.bottom;

    let top = rect.bottom + 8;
    if (spaceBelow < popoverHeight && rect.top > popoverHeight) {
      top = rect.top - popoverHeight - 8;
    }

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    if (left < 16) left = 16;

    setPopoverCoords({ top, left });
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      updateCoords();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Reposiciona em resize/scroll
  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => updateCoords();
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updateCoords]);

  // Máscara e digitação direta no input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    let formatted = raw;
    if (raw.length > 2 && raw.length <= 4) {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    } else if (raw.length > 4) {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`;
    }
    setDisplayValue(formatted);

    if (raw.length === 8) {
      const day = parseInt(raw.slice(0, 2), 10);
      const month = parseInt(raw.slice(2, 4), 10);
      const year = parseInt(raw.slice(4, 8), 10);

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1920 && year <= 2026) {
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        onChange(iso);
        setViewYear(year);
        setViewMonth(month - 1);
      }
    } else if (raw.length === 0) {
      onChange('');
    }
  };

  const handleSelectDay = (day: number) => {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(iso);
    setDisplayValue(`${String(day).padStart(2, '0')}/${String(viewMonth + 1).padStart(2, '0')}/${viewYear}`);
    setIsOpen(false);
  };

  // Cálculo de dias do mês
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

  // Anos disponíveis para seleção direta (ex: 1940 a ano atual)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 90 }, (_, i) => currentYear - i);

  const parsedCurrent = value ? new Date(value + 'T00:00:00') : null;
  const isSelected = (day: number) => {
    if (!parsedCurrent) return false;
    return (
      parsedCurrent.getFullYear() === viewYear &&
      parsedCurrent.getMonth() === viewMonth &&
      parsedCurrent.getDate() === day
    );
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Campo em formato Pílula de Alto Padrão Apex */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          maxLength={10}
          className={`w-full bg-white/95 text-[#08090C] placeholder:text-slate-400 text-xs sm:text-sm font-medium rounded-full pl-4 pr-10 py-2 sm:py-2.5 outline-none focus:ring-2 focus:ring-[#FF1717]/80 shadow-sm transition-all ${className}`}
        />
        <button
          type="button"
          onClick={handleToggle}
          className="absolute right-3 text-slate-500 hover:text-[#FF1717] transition-colors cursor-pointer"
          title="Abrir calendário"
        >
          <CalendarIcon size={15} />
        </button>
      </div>

      {/* Popover em Portal Flutuante (Fixed z-index no Body, ZERO impacto na altura do card) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <>
                {/* Backdrop transparente para capturar clique fora */}
                <div
                  className="fixed inset-0 z-[290] cursor-default"
                  onClick={() => setIsOpen(false)}
                />

                {/* Popover flutuante com posicionamento fixo */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    position: 'fixed',
                    top: popoverCoords.top,
                    left: popoverCoords.left,
                  }}
                  className="z-[300] w-[290px] rounded-2xl bg-[#0B0E14] border border-white/20 shadow-[0_25px_70px_rgba(0,0,0,0.95),0_0_30px_rgba(255,23,23,0.18)] p-3.5 text-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header: Seletor de Mês e Ano */}
                  <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-white/10">
                    <div className="flex items-center gap-1.5">
                      <select
                        value={viewMonth}
                        onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                        className="bg-white/10 text-white text-xs font-semibold rounded-lg px-2 py-1 outline-none border border-white/15 cursor-pointer appearance-none"
                      >
                        {MONTH_NAMES.map((name, idx) => (
                          <option key={name} value={idx} className="bg-[#0B0E14] text-white">
                            {name}
                          </option>
                        ))}
                      </select>

                      <select
                        value={viewYear}
                        onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                        className="bg-white/10 text-white text-xs font-semibold rounded-lg px-2 py-1 outline-none border border-white/15 cursor-pointer appearance-none font-mono"
                      >
                        {yearOptions.map((y) => (
                          <option key={y} value={y} className="bg-[#0B0E14] text-white">
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (viewMonth === 0) {
                            setViewMonth(11);
                            setViewYear((prev) => prev - 1);
                          } else {
                            setViewMonth((prev) => prev - 1);
                          }
                        }}
                        className="p-1 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                        title="Mês anterior"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (viewMonth === 11) {
                            setViewMonth(0);
                            setViewYear((prev) => prev + 1);
                          } else {
                            setViewMonth((prev) => prev + 1);
                          }
                        }}
                        className="p-1 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                        title="Próximo mês"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Cabeçalho dos Dias da Semana */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-1">
                    {WEEK_DAYS.map((w, i) => (
                      <span key={i} className="text-[10px] font-mono text-white/40 font-bold">
                        {w}
                      </span>
                    ))}
                  </div>

                  {/* Grade de Dias */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {Array.from({ length: firstDayIndex }).map((_, i) => (
                      <div key={`empty-${i}`} className="h-7 w-7" />
                    ))}

                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const active = isSelected(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleSelectDay(day)}
                          className={`h-7 w-7 rounded-full text-xs font-medium flex items-center justify-center transition-all cursor-pointer ${
                            active
                              ? 'bg-[#FF1717] text-white font-bold shadow-[0_0_12px_rgba(255,23,23,0.8)] scale-105'
                              : 'text-white/80 hover:bg-white/15 hover:text-white'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>

                  {/* Rodapé Rápido: Limpar / Fechar */}
                  <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        onChange('');
                        setDisplayValue('');
                        setIsOpen(false);
                      }}
                      className="text-white/45 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <X size={11} /> Limpar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="text-white/60 hover:text-white transition-colors cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};

export default ApexDatePicker;

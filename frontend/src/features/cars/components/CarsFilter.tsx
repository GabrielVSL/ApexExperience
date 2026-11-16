'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, ChevronDown, X } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';
import { format, parseISO, startOfDay } from 'date-fns';
import 'react-day-picker/dist/style.css';

interface CarsFilterProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onClear: () => void;
}

export function getDayOperationProfile(dateStr: string): {
  label: string;
  tone: string;
} | null {
  if (!dateStr) return null;
  const parsed = parseISO(dateStr);
  const day = parsed.getDay();
  if (day === 1) {
    return { label: 'Manutenção FIA', tone: 'text-rose-400' };
  }
  if (day === 5 || day === 6 || day === 0) {
    return { label: 'Full Grid + Noturno', tone: 'text-emerald-400' };
  }
  return { label: 'Operação Técnica', tone: 'text-amber-300' };
}

export function CarsFilter({ selectedDate, onDateChange, onClear }: CarsFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const parsedSelected = selectedDate ? parseISO(selectedDate) : undefined;
  const profile = getDayOperationProfile(selectedDate);

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) return;
    if (day.getDay() === 1) return; // Segunda-feira fechada para manutenção FIA
    onDateChange(format(day, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={popupRef}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full flex items-center justify-between gap-2 text-left text-xs sm:text-sm font-medium text-white cursor-pointer group"
        >
          <span className="flex items-center gap-2 truncate">
            <CalendarDays size={14} className="text-[#FF1717] shrink-0" />
            <span className="tabular-nums truncate">
              {selectedDate ? format(parseISO(selectedDate), 'dd/MM/yyyy') : 'Qualquer data'}
            </span>
            {profile && (
              <span className={`hidden xl:inline text-[11px] font-normal ${profile.tone}`}>
                · {profile.label}
              </span>
            )}
          </span>
          <ChevronDown
            size={14}
            className={`text-white/40 group-hover:text-white transition-transform shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {selectedDate && (
          <button
            type="button"
            onClick={onClear}
            className="text-white/40 hover:text-white p-1 rounded-full hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
            title="Limpar data"
          >
            <X size={13} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-4 z-50 w-[320px] bg-[#121622] rounded-3xl p-4 shadow-[0_28px_70px_rgba(0,0,0,0.85)]"
          >
            <div className="bg-white rounded-2xl p-2.5">
              <DayPicker
                mode="single"
                selected={parsedSelected}
                onSelect={handleDaySelect}
                disabled={(day) => day < startOfDay(new Date()) || day.getDay() === 1}
                locale={ptBR}
                showOutsideDays={false}
              />
            </div>

            <div className="mt-3 pt-3 space-y-1 text-[11px] text-white/60">
              <p className="text-rose-400">• Segunda: Pista fechada (Manutenção FIA)</p>
              <p className="text-amber-300">• Ter–Qui: Operação técnica (Manhã/Tarde)</p>
              <p className="text-emerald-400">• Sex–Dom: Full Grid + Sessão Noturna</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

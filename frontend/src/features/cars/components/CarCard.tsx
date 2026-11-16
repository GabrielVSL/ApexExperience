'use client';

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Flame, Gauge, Zap } from 'lucide-react';
import { Automovel } from './BookingModal';
import { useCurrencyStore } from '@/store/useCurrencyStore';
import { useAuthStore } from '@/store/useAuthStore';
import { getCarDisplaySpecs, resolveStudioCarImage } from '@/lib/carPresentation';

interface CarCardProps {
  carro: Automovel;
  index: number;
  onSelect: (car: Automovel) => void;
}

const formatShortCircuitName = (name: string) =>
  name
    .replace('Circuit de la Sarthe ', '')
    .replace('Circuit de ', '')
    .replace('Autodromo Nazionale ', '')
    .replace('Autódromo de ', '')
    .replace(' International Racing Course', '')
    .replace(' Nordschleife', '')
    .replace(' Circuit', '')
    .replace(/[()]/g, '')
    .trim();

export function CarCard({ carro, index, onSelect }: CarCardProps) {
  const { formatPrice } = useCurrencyStore();
  const { user } = useAuthStore();
  const isStaff = Boolean(user && user.role !== 'CLIENTE');
  const staffTarget = '/frota';
  const specs = getCarDisplaySpecs(carro);
  const imageSrc = resolveStudioCarImage(carro);

  const circuitosList =
    carro.circuitosDisponiveis && carro.circuitosDisponiveis.length > 0
      ? carro.circuitosDisponiveis.map((c) => formatShortCircuitName(c.nome))
      : [specs.circuit];

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.24), duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      className="group relative rounded-3xl bg-[#0D1017] hover:bg-[#121621] p-6 sm:p-7 flex flex-col justify-between transition-colors duration-300 overflow-hidden"
    >
      {/* Glow radial sutil no hover */}
      <div
        className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-0 group-hover:opacity-60 transition-opacity duration-500 blur-2xl"
        style={{
          background:
            'radial-gradient(circle, rgba(255, 23, 23, 0.2) 0%, transparent 70%)',
        }}
      />

      {/* Topo do Card: Nome + Subtítulo à esquerda | Categoria + Link à direita */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/cars/${carro.id}`}
            className="block text-lg sm:text-xl font-medium tracking-tight text-white group-hover:text-white transition-colors truncate"
          >
            {carro.marca} {carro.modelo}
          </Link>
          <p className="text-xs text-white/45 mt-0.5">
            {specs.category} Track · {carro.ano}
          </p>
        </div>

        <Link
          to={`/cars/${carro.id}`}
          aria-label={`Abrir ficha de ${carro.marca} ${carro.modelo}`}
          className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-[#FF1717] text-white/70 hover:text-white flex items-center justify-center transition-colors shrink-0"
        >
          <ArrowUpRight size={15} />
        </Link>
      </div>

      {/* Palco da Imagem em Estúdio */}
      <Link
        to={`/cars/${carro.id}`}
        className="relative z-10 h-44 sm:h-48 w-full flex items-center justify-center my-4 cursor-pointer"
        aria-label={`Ver detalhes de ${carro.marca} ${carro.modelo}`}
      >
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[74%] h-7 rounded-full bg-black/80 blur-xl group-hover:bg-[#FF1717]/15 transition-colors duration-500 pointer-events-none" />
        <img
          src={imageSrc}
          alt={`${carro.marca} ${carro.modelo}`}
          loading="lazy"
          className="relative z-10 w-full h-full object-contain drop-shadow-[0_16px_26px_rgba(0,0,0,0.85)] group-hover:-translate-y-1 group-hover:scale-[1.03] transition-all duration-500"
        />
      </Link>

      {/* Pílulas de Circuitos Homologados */}
      <div className="relative z-10 flex flex-wrap items-center justify-end gap-1.5 mb-4">
        {circuitosList.slice(0, 3).map((circuito) => (
          <span
            key={circuito}
            className="px-2.5 py-0.5 rounded-full text-[11px] bg-white/[0.05] text-white/60"
          >
            {circuito}
          </span>
        ))}
      </div>

      {/* Linha de Telemetria Compacta + Preço (inspirado no rodapé dos cards da ref.) */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-3.5 text-xs text-white/60 tabular-nums">
          <span className="inline-flex items-center gap-1" title="Potência">
            <Gauge size={13} className="text-[#FF1717]" />
            {specs.power}
          </span>
          <span className="inline-flex items-center gap-1" title="0 a 100 km/h">
            <Zap size={13} className="text-amber-300" />
            {specs.accel}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1" title="Velocidade máxima">
            <Flame size={13} className="text-emerald-300" />
            {specs.topSpeed}
          </span>
        </div>

        <div className="text-base sm:text-lg font-semibold tracking-tight text-white tabular-nums">
          {formatPrice(carro.precoPorDia)}
          <span className="text-xs font-normal text-white/45 ml-0.5">/sessão</span>
        </div>
      </div>

      {/* Ação Rápida de Reserva */}
      <div className="relative z-10 mt-5 flex items-center justify-between gap-3">
        <Link
          to={`/cars/${carro.id}`}
          className="text-xs font-medium text-white/55 hover:text-white transition-colors"
        >
          Ver ficha técnica
        </Link>

        {isStaff ? (
          <Link
            to={staffTarget}
            className="bg-white/[0.08] hover:bg-[#FF1717] text-white text-xs font-medium px-5 py-2.5 rounded-full transition-colors"
          >
            Gerenciar nos boxes
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onSelect(carro)}
            className="bg-white text-[#08090C] hover:bg-[#FF1717] hover:text-white text-xs font-medium px-5 py-2.5 rounded-full transition-colors cursor-pointer"
          >
            Reservar sessão
          </button>
        )}
      </div>
    </motion.article>
  );
}

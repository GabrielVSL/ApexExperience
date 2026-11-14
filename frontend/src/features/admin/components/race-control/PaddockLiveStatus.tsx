'use client';

import { useState } from 'react';
import {
  Flag,
  CloudSun,
  Server,
  MapPin,
  Clock,
} from 'lucide-react';

interface PaddockLiveStatusProps {
  saudeQueue: {
    motor: string;
    status: string;
    tamanhoFilaAtual: number;
    tamanhoDlqAtual: number;
    totalEnfileiradas: number;
    totalSucessos: number;
    totalFalhas: number;
    totalDlq: number;
    dlqNome: string;
  };
  ocupacaoBoxes: Record<
    string,
    { circuitoNome: string; totalVagas: number; totalOcupadas: number; taxaOcupacaoPercentual: number }
  >;
}

type TrackFlag = 'GREEN' | 'YELLOW' | 'RED' | 'WET';

export default function PaddockLiveStatus({
  saudeQueue,
  ocupacaoBoxes,
}: PaddockLiveStatusProps) {
  const [currentFlag, setCurrentFlag] = useState<TrackFlag>('GREEN');

  const flagConfigs = {
    GREEN: {
      label: 'Bandeira Verde · Pista Liberada',
      color: 'bg-emerald-500 text-black border-emerald-400',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      desc: 'Pista seca e condições térmicas ideais. Boxes abertos para voltas rápidas e sessões oficiais.',
    },
    YELLOW: {
      label: 'Bandeira Amarela · Atenção em Pista',
      color: 'bg-amber-400 text-black border-amber-300',
      badge: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
      desc: 'Veículo em desaceleração ou detrito em setor. Velocidade reduzida nos boxes.',
    },
    RED: {
      label: 'Bandeira Vermelha · Sessão Interrompida',
      color: 'bg-rose-600 text-white border-rose-500',
      badge: 'bg-rose-600/20 text-rose-300 border-rose-600/40',
      desc: 'Sessão paralisada para remoção técnica ou manutenção de zebras. Todos os carros no pitlane.',
    },
    WET: {
      label: 'Pista Molhada · Pneus de Chuva',
      color: 'bg-blue-500 text-white border-blue-400',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      desc: 'Asfalto molhado. Telemetria de tração ajustada e sessões monitoradas via Pace Car.',
    },
  };

  const currentFlagCfg = flagConfigs[currentFlag];

  // Identificação do dia da semana operacional
  const hoje = new Date();
  const diaSemana = hoje.getDay(); // 0 Dom, 1 Seg, ..., 6 Sab
  const isSegunda = diaSemana === 1;
  const isFimDeSemana = diaSemana === 0 || diaSemana === 5 || diaSemana === 6;

  return (
    <div className="space-y-6">
      {/* Barra de Status do Circuito em Tempo Real (Race Control Flag) */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#11131A] via-[#161922] to-[#11131A] border border-white/10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-lg border ${currentFlagCfg.color}`}>
            <Flag size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full border ${currentFlagCfg.badge}`}>
                {currentFlagCfg.label}
              </span>
              <span className="text-[11px] text-white/40 font-mono flex items-center gap-1">
                <Clock size={11} />
                <span>Atualizado em tempo real</span>
              </span>
            </div>
            <p className="text-xs text-white/70 mt-1 max-w-xl">
              {currentFlagCfg.desc}
            </p>
          </div>
        </div>

        {/* Seletor de Condição de Bandeira */}
        <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-full border border-white/10 self-stretch lg:self-auto justify-center">
          {(['GREEN', 'YELLOW', 'RED', 'WET'] as TrackFlag[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setCurrentFlag(f)}
              className={`px-3 py-1 rounded-full text-[11px] font-mono uppercase font-semibold transition-all cursor-pointer ${
                currentFlag === f
                  ? flagConfigs[f].color + ' shadow-md scale-105'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {f === 'GREEN' ? 'Verde' : f === 'YELLOW' ? 'Amarela' : f === 'RED' ? 'Vermelha' : 'Chuva'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Operação: Calendário e Mensageria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Calendário Operacional do Paddock */}
        <div className="p-6 rounded-2xl bg-[#11131A] border border-white/[0.08] space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <CloudSun size={16} className="text-[#FF1717]" />
              Regime Operacional do Paddock
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {isSegunda ? 'Manutenção FIA' : isFimDeSemana ? 'Grid Completo + Noturno' : 'Operação Padrão (2 Turnos)'}
            </span>
          </div>

          <p className="text-xs text-white/60 leading-relaxed">
            {isSegunda
              ? 'Segunda-feira: Pistas fechadas para manutenção de asfalto, calibragem de cronometragem FIA e revisão dos 8 supercarros.'
              : isFimDeSemana
              ? 'Sexta a Domingo: Operação de alta demanda com sessões de Manhã (12 vagas), Tarde (14 vagas) e Noturno sob holofotes (10 vagas).'
              : 'Terça a Quinta: Operação técnica de média intensidade (Manhã e Tarde). Sem sessões noturnas programadas.'}
          </p>

          <div className="grid grid-cols-3 gap-2.5 pt-2 text-center text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] text-white/40 block">Manhã</span>
              <span className="text-white font-bold">08:00 - 12:00</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] text-white/40 block">Tarde</span>
              <span className="text-white font-bold">13:30 - 17:30</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] text-white/40 block">Noturno</span>
              <span className={isFimDeSemana ? 'text-[#FF1717] font-bold' : 'text-white/30'}>
                {isFimDeSemana ? '19:00 - 22:30' : 'Fechado'}
              </span>
            </div>
          </div>
        </div>

        {/* Telemetria de Mensageria & Virtual Threads */}
        <div className="p-6 rounded-2xl bg-[#11131A] border border-white/[0.08] space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <Server size={16} className="text-[#FF1717]" />
              Motor de Filas & Virtual Threads (Java 21)
            </h3>
            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
              {saudeQueue?.status || 'ONLINE'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-1">
            <div className="p-3 rounded-xl bg-white/[0.025] border border-white/5">
              <span className="text-[10px] text-white/40 block">Reservas Concluídas</span>
              <span className="text-xl text-white font-bold">{saudeQueue?.totalSucessos || 0}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.025] border border-white/5">
              <span className="text-[10px] text-white/40 block">Dead Letter Queue (DLQ)</span>
              <span className={`text-xl font-bold ${(saudeQueue?.tamanhoDlqAtual || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {saudeQueue?.tamanhoDlqAtual || 0}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-white/40 font-mono">
            Fila: <span className="text-white/60">apex.reservas.queue</span> · Motor assíncrono com retentativas automáticas e garantia de atomicidade de vagas.
          </p>
        </div>
      </div>

      {/* Ocupação Visual dos Boxes por Autódromo */}
      <div className="p-6 rounded-2xl bg-[#11131A] border border-white/[0.08] space-y-4">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <MapPin size={16} className="text-[#FF1717]" />
          Capacidade dos Boxes nos 8 Autódromos
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          {Object.entries(ocupacaoBoxes || {}).map(([id, info]) => {
            const pct = info.taxaOcupacaoPercentual || 0;
            return (
              <div key={id} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-white font-sans font-medium text-xs line-clamp-1">{info.circuitoNome}</span>
                  <span className="text-white/60 font-bold shrink-0">{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct > 80 ? 'bg-[#FF1717]' : pct > 40 ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-white/40">
                  <span>{info.totalOcupadas} ocupadas</span>
                  <span>{info.totalVagas} vagas</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

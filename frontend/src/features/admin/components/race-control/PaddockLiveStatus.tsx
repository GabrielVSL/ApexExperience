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
      color: 'bg-emerald-500 text-[#08090C]',
      badge: 'bg-emerald-500/15 text-emerald-300',
      desc: 'Pista seca e condições térmicas ideais. Boxes abertos para voltas rápidas e sessões oficiais.',
    },
    YELLOW: {
      label: 'Bandeira Amarela · Atenção em Pista',
      color: 'bg-amber-400 text-[#08090C]',
      badge: 'bg-amber-400/15 text-amber-300',
      desc: 'Veículo em desaceleração ou detrito em setor. Velocidade reduzida nos boxes.',
    },
    RED: {
      label: 'Bandeira Vermelha · Sessão Interrompida',
      color: 'bg-[#FF1717] text-white',
      badge: 'bg-[#FF1717]/20 text-[#FF8A8A]',
      desc: 'Sessão paralisada para remoção técnica ou manutenção de zebras. Todos os carros no pitlane.',
    },
    WET: {
      label: 'Pista Molhada · Pneus de Chuva',
      color: 'bg-sky-500 text-white',
      badge: 'bg-sky-500/15 text-sky-300',
      desc: 'Asfalto molhado. Telemetria de tração ajustada e sessões monitoradas via Pace Car.',
    },
  };

  const currentFlagCfg = flagConfigs[currentFlag];

  const hoje = new Date();
  const diaSemana = hoje.getDay();
  const isSegunda = diaSemana === 1;
  const isFimDeSemana = diaSemana === 0 || diaSemana === 5 || diaSemana === 6;

  return (
    <div className="space-y-6 font-sans">
      {/* Barra de Status do Circuito */}
      <div className="p-6 sm:p-7 rounded-3xl bg-[#0D1017] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${currentFlagCfg.color}`}>
            <Flag size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${currentFlagCfg.badge}`}>
                {currentFlagCfg.label}
              </span>
              <span className="text-xs text-white/45 flex items-center gap-1.5">
                <Clock size={12} />
                <span>Atualizado em tempo real</span>
              </span>
            </div>
            <p className="text-xs text-white/65 mt-2 max-w-xl leading-relaxed">
              {currentFlagCfg.desc}
            </p>
          </div>
        </div>

        {/* Seletor de Condição de Bandeira */}
        <div className="flex items-center gap-1 bg-[#121622] p-1 rounded-full self-stretch lg:self-auto justify-center">
          {(['GREEN', 'YELLOW', 'RED', 'WET'] as TrackFlag[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setCurrentFlag(f)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                currentFlag === f
                  ? flagConfigs[f].color
                  : 'text-white/55 hover:text-white'
              }`}
            >
              {f === 'GREEN' ? 'Verde' : f === 'YELLOW' ? 'Amarela' : f === 'RED' ? 'Vermelha' : 'Chuva'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Operação: Calendário e Mensageria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 sm:p-7 rounded-3xl bg-[#0D1017] space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <CloudSun size={16} className="text-[#FF1717]" />
              <span>Regime operacional dos autódromos</span>
            </h3>
            <span className="text-xs text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-full">
              {isSegunda ? 'Manutenção FIA' : isFimDeSemana ? 'Agenda de fim de semana' : 'Agenda específica'}
            </span>
          </div>

          <p className="text-xs text-white/60 leading-relaxed">
            {isSegunda
              ? 'Segunda-feira: Pistas fechadas para manutenção de asfalto, calibragem de cronometragem e revisão dos 8 supercarros.'
              : isFimDeSemana
              ? 'Fins de semana: principal janela de operação com baterias diurnas em todos os circuitos ativos e sessão noturna especial em Le Mans.'
              : 'Dias úteis: abertura conforme o calendário real de cada circuito (Touristenfahrten à tarde em Nürburgring, Open Pitlane selecionado em Spa/Silverstone e SMSC em Suzuka).'}
          </p>

          <div className="grid grid-cols-3 gap-2.5 pt-1 text-center text-xs">
            <div className="p-3 rounded-2xl bg-[#121622]">
              <span className="text-[11px] text-white/45 block">Manhã</span>
              <span className="text-white font-medium tabular-nums mt-0.5 block">08:00 – 12:00</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#121622]">
              <span className="text-[11px] text-white/45 block">Tarde</span>
              <span className="text-white font-medium tabular-nums mt-0.5 block">13:00 – 17:00</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#121622]">
              <span className="text-[11px] text-white/45 block">Noturno</span>
              <span className="text-white/75 font-medium tabular-nums mt-0.5 block">
                Le Mans (Sáb)
              </span>
            </div>
          </div>
        </div>

        {/* Telemetria de Filas */}
        <div className="p-6 sm:p-7 rounded-3xl bg-[#0D1017] space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <Server size={16} className="text-[#FF1717]" />
              <span>Processamento de reservas ({saudeQueue?.motor || 'VirtualThreads'})</span>
            </h3>
            <span className="text-xs text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-full">
              {saudeQueue?.status || 'ONLINE'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-[#121622]">
              <span className="text-white/45 block">Reservas concluídas</span>
              <span className="text-2xl text-white font-medium tabular-nums mt-1 block">
                {saudeQueue?.totalSucessos || 0}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#121622]">
              <span className="text-white/45 block">Fila de falhas (DLQ)</span>
              <span
                className={`text-2xl font-medium tabular-nums mt-1 block ${
                  (saudeQueue?.tamanhoDlqAtual || 0) > 0 ? 'text-rose-300' : 'text-emerald-300'
                }`}
              >
                {saudeQueue?.tamanhoDlqAtual || 0}
              </span>
            </div>
          </div>

          <p className="text-xs text-white/45 leading-relaxed">
            Motor assíncrono com controle de concorrência e garantia de atomicidade das vagas por turno.
          </p>
        </div>
      </div>

      {/* Ocupação Visual dos Boxes por Autódromo */}
      <div className="p-6 sm:p-7 rounded-3xl bg-[#0D1017] space-y-4">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <MapPin size={16} className="text-[#FF1717]" />
          <span>Ocupação dos boxes nos 8 autódromos</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {Object.entries(ocupacaoBoxes || {}).map(([id, info]) => {
            const pct = info.taxaOcupacaoPercentual || 0;
            return (
              <div key={id} className="p-4 rounded-2xl bg-[#121622] space-y-2.5">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-white font-medium line-clamp-1">{info.circuitoNome}</span>
                  <span className="text-white/75 font-semibold shrink-0 tabular-nums">{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#08090C] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct > 80 ? 'bg-[#FF1717]' : pct > 40 ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-white/45 tabular-nums">
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

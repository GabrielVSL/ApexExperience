'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CIRCUITS, Circuit, CircuitLiveWeather, getCircuitLiveWeather } from '@/services/telemetryService';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/services/api';
import { Automovel } from '@/features/booking/SessionBookingModal';
import { resolveStudioCarImage, getCarDisplaySpecs } from '@/lib/carPresentation';
import CircuitBookingModal from '../components/CircuitBookingModal';
import WorldMapCanvas from '../components/WorldMapCanvas';
import { CountryFlag } from '@/components/ui/CountryFlag';
import {
  Volume2,
  VolumeX,
  Maximize2,
  X,
  Thermometer,
  ArrowUpRight,
} from 'lucide-react';

interface CircuitDisplayMeta {
  simplifiedName: string;
  countryCode: string;
  countryName: string;
  modality: string;
}

const CIRCUIT_META: Record<string, CircuitDisplayMeta> = {
  nurburgring: {
    simplifiedName: 'Nürburgring',
    countryCode: 'DE',
    countryName: 'Alemanha',
    modality: 'Endurance & 24h Nürburgring',
  },
  le_mans: {
    simplifiedName: 'Le Mans',
    countryCode: 'FR',
    countryName: 'França',
    modality: '24h de Le Mans & WEC',
  },
  spa: {
    simplifiedName: 'Spa-Francorchamps',
    countryCode: 'BE',
    countryName: 'Bélgica',
    modality: 'Fórmula 1 & 24h de Spa',
  },
  monza: {
    simplifiedName: 'Monza',
    countryCode: 'IT',
    countryName: 'Itália',
    modality: 'Fórmula 1 & GT Velocidade Máxima',
  },
  monaco: {
    simplifiedName: 'Mônaco',
    countryCode: 'MC',
    countryName: 'Mônaco',
    modality: 'Fórmula 1 Grand Prix de Mônaco',
  },
  silverstone: {
    simplifiedName: 'Silverstone',
    countryCode: 'GB',
    countryName: 'Reino Unido',
    modality: 'Fórmula 1 & Multi-Modalidades',
  },
  interlagos: {
    simplifiedName: 'Interlagos',
    countryCode: 'BR',
    countryName: 'Brasil',
    modality: 'Fórmula 1 & Multi-Modalidades',
  },
  suzuka: {
    simplifiedName: 'Suzuka',
    countryCode: 'JP',
    countryName: 'Japão',
    modality: 'Fórmula 1 & Super GT',
  },
};

const VIDEO_START_OFFSET_SECONDS: Record<string, number> = {
  suzuka: 2,
};

export default function PistasPage() {
  const [selectedCircuit, setSelectedCircuit] = useState<Circuit>(CIRCUITS[0]);
  const [fleet, setFleet] = useState<Automovel[]>([]);
  const [selectedCarForBooking, setSelectedCarForBooking] = useState<Automovel | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [weatherData, setWeatherData] = useState<Record<string, CircuitLiveWeather>>({});

  const videoRef = useRef<HTMLVideoElement>(null);
  const startOffsetSeconds = VIDEO_START_OFFSET_SECONDS[selectedCircuit.id] ?? 0;

  const currentIndex = CIRCUITS.findIndex((c) => c.id === selectedCircuit.id);

  const currentMeta = CIRCUIT_META[selectedCircuit.id] || {
    simplifiedName: selectedCircuit.name,
    countryCode: 'BR',
    countryName: selectedCircuit.country,
    modality: selectedCircuit.categoryLabel,
  };

  const handleSelectCircuit = useCallback((circuit: Circuit) => {
    setSelectedCircuit(circuit);
  }, []);

  const handleNextCircuit = useCallback(() => {
    const nextIdx = (currentIndex + 1) % CIRCUITS.length;
    handleSelectCircuit(CIRCUITS[nextIdx]);
  }, [currentIndex, handleSelectCircuit]);

  const handlePrevCircuit = useCallback(() => {
    const prevIdx = (currentIndex - 1 + CIRCUITS.length) % CIRCUITS.length;
    handleSelectCircuit(CIRCUITS[prevIdx]);
  }, [currentIndex, handleSelectCircuit]);

  useEffect(() => {
    setIsVideoReady(false);
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [selectedCircuit.id]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      if (!isMuted) {
        videoRef.current.volume = 0.75;
      }
    }
  }, [isMuted]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isBookingOpen || isMapModalOpen) {
        if (e.key === 'Escape') {
          setIsBookingOpen(false);
          setIsMapModalOpen(false);
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        handleNextCircuit();
      } else if (e.key === 'ArrowLeft') {
        handlePrevCircuit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBookingOpen, isMapModalOpen, handleNextCircuit, handlePrevCircuit]);

  useEffect(() => {
    if (weatherData[selectedCircuit.id]) return;

    getCircuitLiveWeather(selectedCircuit).then((weather) => {
      setWeatherData((prev) => ({ ...prev, [selectedCircuit.id]: weather }));
    });
  }, [selectedCircuit, weatherData]);

  useEffect(() => {
    api
      .get('/api/automoveis')
      .then((res) => setFleet(Array.isArray(res.data) ? res.data : []))
      .catch(() => setFleet([]));
  }, []);

  const circuitCars = useMemo(() => {
    return fleet.filter(
      (car) =>
        car.circuito?.id === selectedCircuit.id ||
        car.circuitosDisponiveis?.some((c) => c.id === selectedCircuit.id)
    );
  }, [fleet, selectedCircuit.id]);

  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isStaff = Boolean(user && user.role !== 'CLIENTE');
  const staffTarget = '/frota';

  const activeWeather = weatherData[selectedCircuit.id] || null;

  const handleOpenBooking = (car?: Automovel) => {
    if (isStaff) {
      navigate(staffTarget);
      return;
    }
    setSelectedCarForBooking(car || null);
    setIsBookingOpen(true);
  };

  return (
    <div className="relative w-full min-h-[100dvh] bg-[#08090C] text-white overflow-x-hidden select-none font-sans flex flex-col">
      {/* 1. Vídeo Nativo de Fundo */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <img
          key={`poster-${selectedCircuit.id}`}
          src={selectedCircuit.videoThumbnail}
          alt={selectedCircuit.name}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 z-[1] ${
            isVideoReady ? 'opacity-0' : 'opacity-100'
          }`}
        />

        <video
          ref={videoRef}
          key={`video-${selectedCircuit.id}`}
          src={`/circuits/${selectedCircuit.id}.mp4`}
          autoPlay
          loop={startOffsetSeconds === 0}
          muted={isMuted}
          playsInline
          onLoadedMetadata={(e) => {
            if (startOffsetSeconds > 0 && e.currentTarget.currentTime < startOffsetSeconds) {
              e.currentTarget.currentTime = startOffsetSeconds;
            }
          }}
          onSeeked={(e) => {
            if (startOffsetSeconds > 0 && e.currentTarget.currentTime >= startOffsetSeconds - 0.1) {
              setIsVideoReady(true);
            }
          }}
          onPlaying={(e) => {
            if (startOffsetSeconds > 0 && e.currentTarget.currentTime < startOffsetSeconds - 0.1) {
              e.currentTarget.currentTime = startOffsetSeconds;
              return;
            }
            setIsVideoReady(true);
          }}
          onCanPlayThrough={(e) => {
            if (startOffsetSeconds > 0 && e.currentTarget.currentTime < startOffsetSeconds - 0.1) {
              e.currentTarget.currentTime = startOffsetSeconds;
              return;
            }
            setIsVideoReady(true);
          }}
          onEnded={(e) => {
            if (startOffsetSeconds > 0) {
              e.currentTarget.currentTime = startOffsetSeconds;
              e.currentTarget.play().catch(() => {});
            }
          }}
          className="absolute inset-0 w-full h-full object-cover opacity-85 z-0"
        />

        {/* Vinhetas suaves para legibilidade sem cortes bruscos */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#08090C] via-[#08090C]/88 via-45% md:via-52% to-transparent z-10" />
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#08090C] via-[#08090C]/60 to-transparent z-10" />
        <div className="absolute bottom-0 left-0 right-0 h-44 bg-gradient-to-t from-[#08090C] via-[#08090C]/90 to-transparent z-10" />
      </div>

      {/* 2. Controle de Áudio Discreto */}
      <div className="fixed top-20 right-3.5 sm:right-5 z-20 pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsMuted((prev) => !prev)}
          className="w-9 h-9 rounded-full bg-[#0D1017]/80 backdrop-blur-md text-white/55 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          title={isMuted ? 'Ativar som do motor' : 'Mutar som'}
          aria-label={isMuted ? 'Ativar som do motor' : 'Mutar som'}
        >
          {isMuted ? (
            <VolumeX size={16} />
          ) : (
            <Volume2 size={16} className="text-[#FF1717]" />
          )}
        </button>
      </div>

      {/* 3. Conteúdo Principal Responsivo (Coluna Info à Esquerda + Mapa Proporcional à Direita) */}
      <div className="relative z-10 w-full flex-1 pt-20 pb-3 px-5 sm:px-8 lg:px-14 pointer-events-none flex flex-col justify-end lg:justify-center">
        <div className="w-full max-w-7xl mx-auto flex flex-col lg:grid lg:grid-cols-[minmax(0,560px)_1fr] lg:items-center gap-5 lg:gap-8 xl:gap-12">
          {/* Coluna Esquerda: Informações do Circuito + Frota + Ação */}
          <div className="w-full max-w-xl flex flex-col justify-center pointer-events-auto min-w-0">
            {/* Pill de Localização com Bandeira */}
            <div className="inline-flex items-center gap-2.5 pl-2.5 pr-3.5 py-1 rounded-full bg-white/[0.06] backdrop-blur-md self-start mb-2 shrink-0">
              <CountryFlag countryCode={currentMeta.countryCode} className="w-4 h-3 rounded-[2px]" />
              <span className="text-xs font-medium text-white/80">
                {currentMeta.countryName} · {currentMeta.modality}
              </span>
            </div>

            {/* Título do Circuito */}
            <h1 className="text-2xl sm:text-3xl xl:text-[42px] font-medium tracking-tight text-white leading-[1.08] mb-2 shrink-0">
              {selectedCircuit.name}
            </h1>

            {/* Sinopse */}
            <p className="text-xs sm:text-sm text-white/65 font-normal leading-relaxed mb-3 max-w-xl shrink-0 line-clamp-2">
              {selectedCircuit.synopsis}
            </p>

            {/* Barra de Telemetria da Pista */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 py-2.5 px-4 mb-3 rounded-2xl bg-[#0D1017]/85 backdrop-blur-md max-w-xl shrink-0">
              <div>
                <span className="block text-[11px] text-white/45">Extensão</span>
                <span className="text-xs sm:text-sm font-medium text-white tabular-nums">
                  {selectedCircuit.lengthKm}
                </span>
              </div>

              <div>
                <span className="block text-[11px] text-white/45">Traçado</span>
                <span className="text-xs sm:text-sm font-medium text-white tabular-nums">
                  {selectedCircuit.corners} curvas
                </span>
              </div>

              <div>
                <span className="block text-[11px] text-white/45">Recorde</span>
                <span className="text-xs sm:text-sm font-medium text-white tabular-nums">
                  {selectedCircuit.lapRecord}
                </span>
              </div>

              {activeWeather && (
                <div className="hidden sm:block">
                  <span className="block text-[11px] text-white/45">Asfalto</span>
                  <span className="text-xs sm:text-sm font-medium text-white tabular-nums inline-flex items-center gap-1">
                    <Thermometer size={12} className="text-[#FF1717]" />
                    {activeWeather.temperature}°C · {activeWeather.gripStatus}
                  </span>
                </div>
              )}
            </div>

            {/* Supercarros Homologados no Box */}
            <div className="mb-3 max-w-xl shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-white/60">
                  Supercarros homologados no box
                </span>
                <span className="text-[11px] text-white/45 tabular-nums">
                  {circuitCars.length} {circuitCars.length === 1 ? 'modelo' : 'modelos'}
                </span>
              </div>

              {circuitCars.length > 0 ? (
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {circuitCars.map((car) => {
                    const specs = getCarDisplaySpecs(car);
                    return (
                      <button
                        key={car.id}
                        type="button"
                        onClick={() => handleOpenBooking(car)}
                        className="group relative rounded-2xl bg-[#0D1017]/80 hover:bg-[#141925] backdrop-blur-md p-2.5 sm:p-3 text-left transition-all duration-200 cursor-pointer"
                        title={`Agendar sessão com ${car.marca} ${car.modelo}`}
                      >
                        <div className="relative h-12 sm:h-14 xl:h-16 w-full flex items-center justify-center mb-1.5">
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[75%] h-3 rounded-full bg-black/80 blur-md group-hover:bg-[#FF1717]/20 transition-colors pointer-events-none" />
                          <img
                            src={resolveStudioCarImage(car)}
                            alt={`${car.marca} ${car.modelo}`}
                            loading="lazy"
                            className="relative z-10 w-full h-full object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.9)] group-hover:-translate-y-0.5 group-hover:scale-[1.05] transition-transform duration-300"
                          />
                        </div>

                        <p className="text-[11px] sm:text-xs font-medium text-white truncate">
                          {car.modelo}
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-white/45 tabular-nums truncate">
                          {specs.power} · {specs.accel}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-white/40 py-3">
                  Conecte o backend para carregar os carros deste box...
                </p>
              )}
            </div>

            {/* Ação Principal */}
            <div className="flex items-center justify-between gap-4 max-w-xl shrink-0">
              <span className="text-[11px] text-white/45 hidden sm:inline">
                Clique em um veículo ou abra a agenda completa do circuito
              </span>

              {isStaff ? (
                <Link
                  to={staffTarget}
                  className="inline-flex items-center gap-2 bg-white text-[#08090C] hover:bg-[#FF1717] hover:text-white text-xs font-medium px-5 py-2.5 rounded-full transition-colors ml-auto"
                >
                  <span>Gerenciar nos boxes</span>
                  <ArrowUpRight size={14} />
                </Link>
              ) : (
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => handleOpenBooking()}
                    className="inline-flex items-center bg-white text-[#08090C] hover:bg-white/90 text-xs font-medium px-5 py-2.5 rounded-full transition-colors cursor-pointer"
                  >
                    Ver disponibilidade
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenBooking()}
                    aria-label="Ver disponibilidade"
                    className="w-9 h-9 rounded-full bg-[#FF1717] hover:bg-[#e01414] text-white flex items-center justify-center transition-transform hover:scale-105 shadow-[0_0_20px_rgba(255,23,23,0.35)] cursor-pointer"
                  >
                    <ArrowUpRight size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Coluna Direita: Mapa Interativo centralizado e dimensionado com respiro */}
          <div className="pointer-events-auto w-full max-w-xl lg:max-w-[480px] xl:max-w-[540px] h-[220px] sm:h-[240px] lg:h-[310px] xl:h-[340px] lg:min-h-0 lg:self-center lg:justify-self-center flex flex-col rounded-3xl bg-[#0D1017]/85 backdrop-blur-md shadow-[0_24px_60px_rgba(0,0,0,0.85)] overflow-hidden relative">
            <button
              type="button"
              onClick={() => setIsMapModalOpen(true)}
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-[#08090C]/85 hover:bg-[#FF1717] text-white/75 hover:text-white backdrop-blur-md flex items-center justify-center transition-colors cursor-pointer"
              title="Expandir mapa em tela cheia"
            >
              <Maximize2 size={13} />
            </button>

            <div className="relative w-full flex-1 min-h-0">
              <WorldMapCanvas
                circuits={CIRCUITS}
                selectedCircuit={selectedCircuit}
                compact={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. FITA NO RODAPÉ: TODOS OS 8 CIRCUITOS NO FLUXO SEM COLISÃO
          ========================================================================= */}
      <div className="relative z-30 shrink-0 pointer-events-auto flex items-center justify-center px-4 sm:px-8 lg:px-12 xl:px-14 pt-2 pb-3">
        <div className="flex items-center gap-2 w-full max-w-7xl mx-auto overflow-x-auto no-scrollbar lg:overflow-visible">
          {CIRCUITS.map((circuit) => {
            const isActive = circuit.id === selectedCircuit.id;
            const meta = CIRCUIT_META[circuit.id] || {
              simplifiedName: circuit.name,
              countryCode: 'BR',
              countryName: circuit.country,
              modality: circuit.categoryLabel,
            };

            return (
              <button
                key={circuit.id}
                type="button"
                onClick={() => handleSelectCircuit(circuit)}
                className={`group relative shrink-0 lg:shrink lg:flex-auto min-w-[132px] lg:min-w-0 flex items-center gap-2 px-2.5 xl:px-3 py-2 sm:py-2.5 rounded-xl transition-all duration-200 cursor-pointer border ${
                  isActive
                    ? 'bg-white/10 border-[#FF1717] ring-1 ring-[#FF1717]/50 shadow-lg'
                    : 'bg-[#08090C]/80 hover:bg-white/[0.07] border-white/10 hover:border-white/20'
                }`}
              >
                {/* Bandeira Vetorial do País */}
                <CountryFlag
                  countryCode={meta.countryCode}
                  className="w-5 h-3.5 sm:w-6 sm:h-4 rounded-[2px] shadow-sm border border-white/10 shrink-0"
                />

                {/* Nome do Circuito e País Padronizados */}
                <div className="flex flex-col items-start text-left min-w-0 flex-1 overflow-hidden">
                  <span className="text-[9px] font-mono text-white/45 uppercase tracking-wider truncate w-full leading-none mb-1">
                    {meta.countryName}
                  </span>
                  <span
                    className={`text-[11px] xl:text-xs tracking-tight truncate w-full transition-colors ${
                      isActive ? 'text-white font-semibold' : 'text-white/80 group-hover:text-white'
                    }`}
                  >
                    {meta.simplifiedName}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Modal do Mapa em Tela Cheia Sem Bordas */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
          <div className="relative w-full max-w-6xl h-[85vh] rounded-3xl bg-[#0D1017] overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 flex items-center justify-between bg-[#0B0E14] z-10">
              <div className="flex items-center gap-3">
                <CountryFlag countryCode={currentMeta.countryCode} className="w-6 h-4 rounded-[2px]" />
                <div>
                  <h3 className="text-sm sm:text-base font-medium text-white">
                    {selectedCircuit.name}
                  </h3>
                  <p className="text-xs text-white/50">
                    {selectedCircuit.location} · {selectedCircuit.country}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMapModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-[#FF1717] text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Fechar Mapa (ESC)"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 w-full h-full relative">
              <WorldMapCanvas
                circuits={CIRCUITS}
                selectedCircuit={selectedCircuit}
                compact={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal de Disponibilidade & Agendamento */}
      <CircuitBookingModal
        circuit={selectedCircuit}
        availableCars={circuitCars}
        initialCar={selectedCarForBooking}
        isOpen={isBookingOpen}
        onClose={() => {
          setIsBookingOpen(false);
          setSelectedCarForBooking(null);
        }}
      />
    </div>
  );
}

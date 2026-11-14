'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { User, Shield, Wallet, LogOut } from 'lucide-react';
import { motion, useScroll, useMotionValue, useSpring, useTransform } from 'framer-motion';
import UserProfileModal from './UserProfileModal';

const MenuIcon = ({ size = 24 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
);

const XIcon = ({ size = 24 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 18 18"/></svg>
);

interface HeaderProps {
  transparent?: boolean;
}

// Cálculo geométrico determinístico para garantir que a logo NUNCA suba além da barra
function getTargetCoords() {
  if (typeof window === 'undefined') return { x: 66, y: 34 };
  const w = window.innerWidth;
  const containerWidth = Math.min(w, 1280);
  const containerLeft = Math.max(0, (w - containerWidth) / 2);
  const paddingLeft = 24; // px-6 = 24px
  return {
    x: containerLeft + paddingLeft + 42,
    y: 34, // Centro vertical exato da linha da navbar (pt-3.5 = 14px + h-10/2 = 20px -> 34px)
  };
}

export default function Header({ transparent = false }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // Dimensões do viewport e slot de destino da Navbar
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });
  const [targetSlot, setTargetSlot] = useState(() => getTargetCoords());
  const logoTargetRef = useRef<HTMLDivElement>(null);

  const updateMeasurements = useCallback(() => {
    if (typeof window === 'undefined') return;
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });

    // Medição real da DOM com proteção de sanidade
    if (logoTargetRef.current) {
      const rect = logoTargetRef.current.getBoundingClientRect();
      if (rect.top >= 0 && rect.top < 100 && rect.height > 0) {
        setTargetSlot({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
        return;
      }
    }
    // Fallback geométrico infalível
    setTargetSlot(getTargetCoords());
  }, []);

  useEffect(() => {
    updateMeasurements();
    window.addEventListener('resize', updateMeasurements);
    const timer = setTimeout(updateMeasurements, 150);
    return () => {
      window.removeEventListener('resize', updateMeasurements);
      clearTimeout(timer);
    };
  }, [updateMeasurements]);

  // Scroll Listener
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- MOTOR DE PARALLAX E 3D TILT COM INÉRCIA LERP (Framer Motion Springs) ---
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothMouseX = useSpring(mouseX, { stiffness: 120, damping: 20, mass: 0.5 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 120, damping: 20, mass: 0.5 });

  useEffect(() => {
    if (!transparent) return;

    const handlePointerMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth - 0.5) * 2;
      const normY = (e.clientY / window.innerHeight - 0.5) * 2;
      mouseX.set(normX * 16);
      mouseY.set(normY * 16);
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('mousemove', handlePointerMove);
  }, [transparent, mouseX, mouseY]);

  // --- MOTOR DE MORPHING NO SCROLL (Progresso de 0 a 1 nos primeiros 240px) ---
  const { scrollY } = useScroll();
  const rawScrollProgress = useTransform(scrollY, [0, 240], [0, 1], { clamp: true });
  const scrollProgress = useSpring(rawScrollProgress, { stiffness: 200, damping: 28, mass: 0.5 });

  const centerX = windowSize.width / 2;
  const centerY = windowSize.height / 2;
  const targetX = targetSlot.x;
  const targetY = targetSlot.y;

  // Interpolação de coordenadas (Centro -> Navbar) com influência amortecida do mouse
  const logoX = useTransform(
    [scrollProgress, smoothMouseX],
    ([p, mx]: number[]) => {
      const base = centerX + (targetX - centerX) * p;
      const mouseInfluence = (1 - p) * mx;
      return base + mouseInfluence;
    }
  );

  const logoY = useTransform(
    [scrollProgress, smoothMouseY],
    ([p, my]: number[]) => {
      const base = centerY + (targetY - centerY) * p;
      const mouseInfluence = (1 - p) * my;
      return base + mouseInfluence;
    }
  );

  // Escala contínua de 1.0 (Hero grande) até 0.33 (Navbar compacta)
  const logoScale = useTransform(scrollProgress, (p: number) => 1 - p * (1 - 0.33));

  // 3D Tilt em perspectiva (reage ao mouse na Hero e estabiliza em 0deg na Navbar)
  const logoRotateX = useTransform(
    [scrollProgress, smoothMouseY],
    ([p, my]: number[]) => (1 - p) * (-my * 0.55)
  );
  const logoRotateY = useTransform(
    [scrollProgress, smoothMouseX],
    ([p, mx]: number[]) => (1 - p) * (mx * 0.55)
  );

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleLoginClick = () => {
    setMobileMenuOpen(false);
    navigate('/login', { state: { from: location.pathname } });
  };

  const handleRegisterClick = () => {
    setMobileMenuOpen(false);
    navigate('/cadastro', { state: { from: location.pathname } });
  };

  const linkClass = "text-sm font-medium tracking-normal text-white/70 hover:text-white transition-colors duration-200 whitespace-nowrap";

  const isNavActive = (path: string) => {
    if (path === '/admin?tab=pilotos') {
      return (
        (location.pathname === '/admin' && location.search.includes('pilotos')) ||
        location.pathname === '/admin/usuarios'
      );
    }
    if (path === '/admin') {
      return location.pathname === '/admin' && !location.search.includes('pilotos');
    }
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  };

  const renderNavLinks = (customClass?: string) => {
    const baseCls = customClass || linkClass;
    const itemCls = (path: string) => {
      const active = isNavActive(path);
      return `${baseCls} relative py-1 ${
        active
          ? '!text-white font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#FF1717] after:rounded-full'
          : 'text-white/65 hover:text-white'
      }`.trim();
    };

    // --- MODO 1: ADMINISTRADOR EXECUTIVO (RACE CONTROL) ---
    if (user?.role === 'ADMIN') {
      return (
        <>
          <Link to="/admin" className={itemCls('/admin')}>Painel Executivo</Link>
          <Link to="/admin?tab=pilotos" className={itemCls('/admin?tab=pilotos')}>Gestão de Pilotos</Link>
          <Link to="/pedidos" className={itemCls('/pedidos')}>Sessões & Paddock</Link>
          <Link to="/cars" className={itemCls('/cars')}>Supercarros</Link>
        </>
      );
    }

    // --- MODO 2: PILOTO AUTENTICADO (CLIENTE) ---
    if (user?.role === 'CLIENTE') {
      return (
        <>
          <Link to="/" className={itemCls('/')}>Início</Link>
          <Link to="/pistas" className={itemCls('/pistas')}>Pistas</Link>
          <Link to="/cars" className={itemCls('/cars')}>Frota</Link>
          <Link to="/meus-alugueis" className={itemCls('/meus-alugueis')}>Minhas Sessões</Link>
        </>
      );
    }

    // --- MODO 3: VISITANTE NÃO AUTENTICADO ---
    return (
      <>
        <Link to="/" className={itemCls('/')}>Início</Link>
        <Link to="/pistas" className={itemCls('/pistas')}>Pistas</Link>
        <Link to="/cars" className={itemCls('/cars')}>Frota</Link>
        <a href="/#como-funciona" className={baseCls}>Como Funciona</a>
      </>
    );
  };

  // Fade out suave de preto para transparente (SEM LINHA de borda cortando embaixo)
  const bgClass = isScrolled 
    ? 'bg-gradient-to-b from-[#08090C] via-[#08090C]/95 to-transparent backdrop-blur-md pt-3.5 pb-8' 
    : transparent 
      ? 'bg-gradient-to-b from-[#08090C]/85 via-[#08090C]/40 to-transparent pt-3.5 pb-8' 
      : 'bg-gradient-to-b from-[#08090C] via-[#08090C]/95 to-transparent pt-3.5 pb-8';

  return (
    <>
      {/* 1. LOGO FÍSICA MORPHING PERSISTENTE (Single Source of Truth para Home) */}
      {transparent && (
        <motion.div
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            x: logoX,
            y: logoY,
            scale: logoScale,
            rotateX: logoRotateX,
            rotateY: logoRotateY,
            transformOrigin: '0px 0px',
            transformStyle: 'preserve-3d',
            perspective: 1000,
            zIndex: 110,
          }}
          className="cursor-pointer select-none pointer-events-auto w-0 h-0"
          aria-label="Apex Home"
        >
          <div className="flex items-center gap-3.5 sm:gap-4 md:gap-4 -translate-x-1/2 -translate-y-1/2 w-max">
            <img 
              src="/logo.png" 
              alt="Apex" 
              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-24 lg:h-24 rounded-2xl md:rounded-3xl object-contain shrink-0 drop-shadow-md" 
            />
            <span className="text-5xl sm:text-6xl md:text-7xl lg:text-7xl font-normal tracking-[-0.035em] text-white font-sans lowercase leading-none -translate-y-0.5 md:-translate-y-1 shrink-0">
              apex
            </span>
          </div>
        </motion.div>
      )}

      {/* 2. NAVBAR SUPERIOR FIXA */}
      <header 
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ease-out ${bgClass}`}
      >
        {/* Indicador no topo */}
        {user?.role === 'ADMIN' && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF1717] to-transparent pointer-events-none" />
        )}

        <div className="container mx-auto px-6">
          <div className="relative flex items-center justify-between h-10">
            
            {/* Slot de Destino: onde a logo morfa e assenta na Home, ou logo estática em subpáginas */}
            {!transparent ? (
              <Link 
                to={user?.role === 'ADMIN' ? '/admin' : '/'} 
                className="flex items-center gap-2.5 group cursor-pointer shrink-0"
              >
                <img 
                  src="/logo.png" 
                  alt="Apex Logo" 
                  className="w-8 h-8 rounded-xl object-contain group-hover:scale-105 transition-transform shrink-0" 
                />
                <span className="text-xl font-normal tracking-[-0.03em] text-white font-sans lowercase leading-none -translate-y-0.5">
                  apex
                </span>
                {user?.role === 'CLIENTE' ? (
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60 font-mono text-[9px] uppercase tracking-wide ml-1">
                    Piloto
                  </span>
                ) : null}
              </Link>
            ) : (
              <div 
                ref={logoTargetRef} 
                className="w-[84px] h-8 opacity-0 pointer-events-none shrink-0" 
              />
            )}

            {/* Desktop Navigation: Na Hero fica alinhado à esquerda; ao rolar, desliza suavemente para o centro! */}
            <motion.nav
              animate={{
                left: isScrolled || !transparent ? '50%' : '0px',
                x: isScrolled || !transparent ? '-50%' : '0%',
                y: '-50%',
              }}
              transition={{
                duration: 0.65,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="hidden lg:flex items-center gap-5 xl:gap-7 whitespace-nowrap font-sans absolute top-1/2 pointer-events-auto"
            >
              {renderNavLinks()}
            </motion.nav>

            {/* Right Controls: Diferenciado para Administrador, Piloto ou Visitante */}
            <div className="hidden md:flex items-center gap-3 font-sans relative z-10">
              {user ? (
                user.role === 'ADMIN' ? (
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => setProfileModalOpen(true)}
                      className="w-9 h-9 rounded-full bg-[#0E121A] hover:bg-white/10 border border-[#FF1717]/40 hover:border-[#FF1717] flex items-center justify-center text-white transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer relative group"
                      title="Abrir perfil de Administrador"
                      aria-label="Perfil de Administrador"
                    >
                      <Shield size={15} className="text-[#FF1717]" />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#FF1717] border border-black" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <Link
                      to="/apexpay"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FF1717]/10 hover:bg-[#FF1717]/20 border border-[#FF1717]/25 text-white text-xs font-mono transition-colors"
                      title="Acessar carteira e saldo ApexPay"
                    >
                      <Wallet size={12} className="text-[#FF1717]" />
                      <span>ApexPay</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setProfileModalOpen(true)}
                      className="w-9 h-9 rounded-full bg-[#0E121A] hover:bg-white/10 border border-white/20 hover:border-[#FF1717] flex items-center justify-center text-white transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer relative group"
                      title="Abrir perfil do piloto"
                      aria-label="Perfil do piloto"
                    >
                      <User size={15} className="text-white/80 group-hover:text-[#FF1717] transition-colors" />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-black" />
                    </button>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-3 font-sans">
                  <button 
                    onClick={handleLoginClick} 
                    className="text-sm font-medium text-white/75 hover:text-white transition-colors px-3 py-1.5 cursor-pointer"
                  >
                    Entrar
                  </button>
                  <button 
                    onClick={handleRegisterClick} 
                    className="bg-[#FF1717] hover:bg-[#e01414] text-white text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full transition-all cursor-pointer shadow-md shadow-[#FF1717]/25 hover:shadow-[#FF1717]/40 active:scale-95"
                  >
                    Cadastrar-se
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Trigger */}
            <div className="md:hidden flex items-center gap-3 relative z-10">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-white p-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer"
                aria-label="Abrir menu"
              >
                {mobileMenuOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
              </button>
            </div>

          </div>

          {/* Mobile Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-6 pt-2 border-t border-white/10 flex flex-col gap-4 font-sans">
              {renderNavLinks("text-sm text-white/80 hover:text-white py-1 font-medium")}
              <div className="pt-4 border-t border-white/10 flex flex-col gap-2">
                {user ? (
                  <>
                    <div className="flex items-center justify-between text-xs text-white/60">
                      <span>{user.email}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        user.role === 'ADMIN' 
                          ? 'bg-[#FF1717]/20 text-[#FF1717] border border-[#FF1717]/30' 
                          : 'bg-white/10 text-white/70'
                      }`}>
                        {user.role === 'ADMIN' ? 'RACE CONTROL' : 'PILOTO'}
                      </span>
                    </div>
                    {user.role === 'CLIENTE' && (
                      <Link
                        to="/apexpay"
                        onClick={() => setMobileMenuOpen(false)}
                        className="py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white flex items-center justify-between"
                      >
                        <span className="flex items-center gap-1.5"><Wallet size={13} className="text-[#FF1717]" /> Carteira ApexPay</span>
                        <span className="text-white/40 text-[10px]">Acessar →</span>
                      </Link>
                    )}
                    <button 
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }} 
                      className="text-left text-red-400 text-sm font-medium pt-1 cursor-pointer flex items-center gap-1"
                    >
                      <LogOut size={13} />
                      <span>Sair da Conta</span>
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <button 
                      onClick={handleLoginClick} 
                      className="flex-1 py-2 rounded-lg bg-white/10 text-white text-sm font-medium cursor-pointer"
                    >
                      Entrar
                    </button>
                    <button 
                      onClick={handleRegisterClick} 
                      className="flex-1 py-2 rounded-lg bg-[#FF1717] text-white text-sm font-medium cursor-pointer"
                    >
                      Cadastrar-se
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </header>

      {/* Modal de Perfil de Usuário / Administrador */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </>
  );
}

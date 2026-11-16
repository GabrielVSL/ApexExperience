import { Link } from 'react-router-dom';
import { ArrowUp, ArrowUpRight } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export default function Footer() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#08090C] px-6 pb-10 pt-6 text-white font-sans select-none">
      <div className="container mx-auto max-w-6xl">
        {/* Card Principal Arredondado sem Borda (Mesma estética da Landing) */}
        <div className="relative rounded-3xl overflow-hidden bg-[#0D1017] p-8 sm:p-12 lg:p-14">
          {/* Glow radial vermelho discreto no canto inferior direito */}
          <div
            className="pointer-events-none absolute -bottom-28 -right-24 w-[420px] h-[420px] rounded-full opacity-45 blur-3xl"
            style={{
              background:
                'radial-gradient(circle, rgba(255, 23, 23, 0.25) 0%, transparent 70%)',
            }}
          />

          {/* Tipografia gigante em marca d'água no fundo */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-6 right-8 text-[96px] sm:text-[150px] lg:text-[190px] font-semibold tracking-[-0.06em] text-white/[0.025] leading-none lowercase"
          >
            apex
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10">
            {/* Coluna Esquerda: Identidade + Status + CTA */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-8">
              <div className="space-y-5">
                <div className="flex items-center justify-between sm:justify-start gap-4 flex-wrap">
                  <Link to="/" className="flex items-center gap-2.5 group">
                    <img
                      src="/logo.png"
                      alt="Apex"
                      className="w-8 h-8 rounded-xl object-contain transition-transform group-hover:scale-105"
                    />
                    <span className="text-xl font-medium tracking-[-0.03em] text-white lowercase">
                      apex
                    </span>
                  </Link>

                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] text-[11px] font-medium text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Boxes abertos · 14 dias
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-white/55 leading-relaxed max-w-sm">
                  Experiências cronometradas nos principais autódromos do mundo com preparação de box, telemetria VBOX e carteira digital integrada.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/pistas"
                  className="inline-flex items-center bg-white text-[#08090C] hover:bg-white/90 text-xs sm:text-sm font-medium px-6 py-3 rounded-full transition-colors"
                >
                  Reservar turno agora
                </Link>
                <Link
                  to="/pistas"
                  aria-label="Reservar turno"
                  className="w-10 h-10 rounded-full bg-[#FF1717] hover:bg-[#e01414] text-white flex items-center justify-center transition-transform hover:scale-105 shadow-[0_0_20px_rgba(255,23,23,0.35)]"
                >
                  <ArrowUpRight size={16} />
                </Link>
              </div>
            </div>

            {/* Coluna Direita: 3 Colunas Limpas de Navegação */}
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
              <div className="space-y-3.5">
                <h4 className="text-xs font-medium text-white/90">Plataforma</h4>
                <ul className="space-y-2.5 text-xs text-white/50">
                  <li>
                    <Link to="/" className="hover:text-white transition-colors">
                      Início
                    </Link>
                  </li>
                  <li>
                    <Link to="/pistas" className="hover:text-white transition-colors">
                      Explorar pistas
                    </Link>
                  </li>
                  <li>
                    <Link to="/cars" className="hover:text-white transition-colors">
                      Frota completa
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={isAdmin ? '/admin' : user ? '/apexpay' : '/login'}
                      className="hover:text-white transition-colors"
                    >
                      {isAdmin ? 'Race Control' : 'Carteira ApexPay'}
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="space-y-3.5">
                <h4 className="text-xs font-medium text-white/90">Modalidades</h4>
                <ul className="space-y-2.5 text-xs text-white/50">
                  <li>
                    <Link to="/pistas" className="hover:text-white transition-colors">
                      Visita ao Box
                    </Link>
                  </li>
                  <li>
                    <Link to="/pistas" className="hover:text-white transition-colors">
                      Fast Lap
                    </Link>
                  </li>
                  <li>
                    <Link to="/pistas" className="hover:text-white transition-colors">
                      Track Experience
                    </Link>
                  </li>
                  <li>
                    <Link to="/pistas" className="hover:text-white transition-colors">
                      Pacote VIP
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="space-y-3.5 col-span-2 sm:col-span-1">
                <h4 className="text-xs font-medium text-white/90">Circuitos</h4>
                <ul className="space-y-2.5 text-xs text-white/50">
                  <li>
                    <Link to="/pistas" className="hover:text-white transition-colors">
                      Interlagos
                    </Link>
                  </li>
                  <li>
                    <Link to="/pistas" className="hover:text-white transition-colors">
                      Spa-Francorchamps
                    </Link>
                  </li>
                  <li>
                    <Link to="/pistas" className="hover:text-white transition-colors">
                      Nürburgring
                    </Link>
                  </li>
                  <li>
                    <Link to="/pistas" className="hover:text-white transition-colors">
                      Mônaco &amp; Suzuka
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Barra Inferior do Footer */}
          <div className="relative z-10 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
            <p>
              &copy; {new Date().getFullYear()} apex · Track Day &amp; High Performance.
            </p>

            <div className="flex items-center gap-4">
              <span className="hidden sm:inline text-white/30">
                Arrive &amp; Drive · Telemetria VBOX
              </span>
              <button
                type="button"
                onClick={scrollToTop}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-white/75 hover:text-white transition-colors cursor-pointer"
              >
                <span>Voltar ao topo</span>
                <ArrowUp size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

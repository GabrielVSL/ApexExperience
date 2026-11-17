import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { ApexErrorIllustration } from '@/components/ui/ApexErrorIllustration';

export interface ErrorPageProps {
  code?: string;
  title?: string;
  subtitle?: string;
  description?: string;
}

interface ErrorPreset {
  code: string;
  headline: string;
  title: string;
  subtitle: string;
  description: string;
}

const ERROR_PRESETS: Record<string, ErrorPreset> = {
  '404': {
    code: '404',
    headline: 'Ops!',
    title: 'Não encontramos',
    subtitle: 'esta página.',
    description:
      'O endereço pode ter sido digitado errado ou esta página não está mais disponível por aqui.',
  },
  '405': {
    code: '405',
    headline: 'Ops!',
    title: 'Não foi possível',
    subtitle: 'abrir por aqui.',
    description:
      'Esta página precisa ser acessada diretamente pelo site. Clique abaixo para voltar e continuar navegando.',
  },
  '401': {
    code: '401',
    headline: 'Ops!',
    title: 'Você precisa entrar',
    subtitle: 'na sua conta.',
    description:
      'Sua sessão terminou ou você ainda não entrou na sua conta. Volte para acessar normalmente.',
  },
  '403': {
    code: '403',
    headline: 'Ops!',
    title: 'Você não tem acesso',
    subtitle: 'a esta página.',
    description:
      'Esta área é restrita para o seu perfil atual. Volte para continuar navegando pelo site.',
  },
  '500': {
    code: '500',
    headline: 'Ops!',
    title: 'Algo deu errado',
    subtitle: 'por aqui.',
    description:
      'Tivemos um problema temporário ao carregar esta página. Volte e tente novamente em alguns instantes.',
  },
};

export default function ErrorPage({
  code: propCode,
  title: propTitle,
  subtitle: propSubtitle,
  description: propDescription,
}: ErrorPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const stateData = (location.state as Partial<ErrorPageProps> | null) || null;
  const resolvedCode =
    propCode || stateData?.code || searchParams.get('code') || '404';
  const preset = ERROR_PRESETS[resolvedCode] || ERROR_PRESETS['500'];

  const finalTitle = propTitle || stateData?.title || preset.title;
  const finalSubtitle = propSubtitle || stateData?.subtitle || preset.subtitle;
  const finalDescription =
    propDescription || stateData?.description || preset.description;

  const handleBack = () => {
    const historyIndex =
      typeof window !== 'undefined' &&
      window.history.state &&
      typeof window.history.state.idx === 'number'
        ? window.history.state.idx
        : 0;

    if (historyIndex > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="relative min-h-screen bg-[#08090C] text-white flex items-center justify-center px-6 py-20 font-sans selection:bg-[#FF1717] selection:text-white overflow-hidden">
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full bg-[#FF1717]/10 blur-[140px]" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-xl rounded-3xl bg-[#0D1017] px-6 py-9 sm:p-11 shadow-2xl text-center space-y-6"
      >
        <ApexErrorIllustration code={resolvedCode} headline={preset.headline} />

        <div className="space-y-3 max-w-md mx-auto">
          <h1 className="text-2xl sm:text-4xl font-medium tracking-tight text-white leading-[1.12]">
            {finalTitle}{' '}
            <span className="italic font-light text-white/85">{finalSubtitle}</span>
          </h1>
          <p className="text-sm text-white/60 leading-relaxed">
            {finalDescription}
          </p>
        </div>

        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={handleBack}
            className="px-7 py-3 rounded-full bg-white hover:bg-white/90 text-[#08090C] text-sm font-semibold inline-flex items-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <ArrowLeft size={16} />
            <span>Voltar</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

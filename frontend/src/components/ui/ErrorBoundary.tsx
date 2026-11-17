import { Component, ErrorInfo, ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ApexErrorIllustration } from '@/components/ui/ApexErrorIllustration';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return {
      hasError: true,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erro não tratado na interface Apex:', error, errorInfo);
  }

  private handleBack = () => {
    this.setState({ hasError: false });
    window.location.assign('/');
  };

  public render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="relative min-h-screen bg-[#08090C] text-white flex items-center justify-center px-6 py-20 font-sans selection:bg-[#FF1717] selection:text-white overflow-hidden">
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full bg-[#FF1717]/10 blur-[140px]" />

        <div className="relative z-10 w-full max-w-xl rounded-3xl bg-[#0D1017] px-6 py-9 sm:p-11 shadow-2xl text-center space-y-6">
          <ApexErrorIllustration code="500" headline="Ops!" />

          <div className="space-y-3 max-w-md mx-auto">
            <h1 className="text-2xl sm:text-4xl font-medium tracking-tight text-white leading-[1.12]">
              Algo deu errado{' '}
              <span className="italic font-light text-white/85">por aqui.</span>
            </h1>
            <p className="text-sm text-white/60 leading-relaxed">
              Tivemos um problema temporário ao carregar esta página. Volte e tente novamente em alguns instantes.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={this.handleBack}
              className="px-7 py-3 rounded-full bg-white hover:bg-white/90 text-[#08090C] text-sm font-semibold inline-flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <ArrowLeft size={16} />
              <span>Voltar</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;

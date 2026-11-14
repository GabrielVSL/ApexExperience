import React from 'react';
import Antigravity from './AntigravityWebGL';

interface AntigravityParticlesBackgroundProps {
  className?: string;
}

/**
 * Antigravity WebGL2 Background (React Bits / Google Antigravity Edition)
 * - Fundo totalmente preto (#000000).
 * - Partículas em formato de cápsula (capsule SDF), alinhadas ao fluxo vetorial e campo radial.
 * - Efeito de respiro suave ("breathing" orgânico via ondas senoidais e pulso de tamanho).
 * - Cores Apex Red (#FF1717, #FF4444, #B30000) intercaladas com branco puro (#FFFFFF).
 * - Renderização via GPU WebGL2 instanciada para 60/120 FPS cravados e resposta imediata ao cursor.
 */
export const AntigravityParticlesBackground: React.FC<AntigravityParticlesBackgroundProps> = ({
  className = '',
}) => {
  return (
    <div
      className={`fixed inset-0 pointer-events-auto z-0 overflow-hidden bg-black select-none ${className}`}
      aria-hidden="true"
    >
      <Antigravity
        count={1400}
        magnetRadius={8.5}
        ringRadius={6.5}
        waveSpeed={0.35}
        waveAmplitude={1.1}
        waveCount={3}
        particleSize={1.15}
        lerpSpeed={0.045}
        particleShape="capsule"
        colorMode="conic"
        colors={[
          '#FF1717', // Vermelho Apex principal
          '#FFFFFF', // Branco puro
          '#FF4444', // Vermelho brilhante
          '#FFFFFF', // Branco puro de contraste
          '#B30000', // Vermelho profundo
          '#FF7373', // Coral Apex
          '#FF1717', // Fechamento de ciclo
        ]}
        colorSpeed={0.03}
        autoAnimate={true}
        particleVariance={1.2}
        pulseSpeed={2.8}
        depthFactor={1.3}
        fieldStrength={10}
        ambient={0.22}
        interactive={true}
        clickBurst={true}
        intro={true}
        lightMode={false}
        opacity={1}
        maxDevicePixelRatio={2}
      />
    </div>
  );
};

export default AntigravityParticlesBackground;

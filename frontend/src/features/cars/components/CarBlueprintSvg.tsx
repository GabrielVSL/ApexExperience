import type { BlueprintArchitecture } from '@/lib/carPresentation';

interface CarBlueprintSvgProps {
  architecture: BlueprintArchitecture;
  className?: string;
}

const BLUEPRINT_ASSETS: Record<BlueprintArchitecture, { src: string; alt: string }> = {
  'rear-engine': {
    src: '/blueprints/blueprint-rear.jpg',
    alt: 'Blueprint técnico motor traseiro em vista superior',
  },
  'mid-engine': {
    src: '/blueprints/blueprint-mid.jpg',
    alt: 'Blueprint técnico motor central em vista superior',
  },
  'front-gt': {
    src: '/blueprints/blueprint-front.jpg',
    alt: 'Blueprint técnico GT dianteiro em vista superior',
  },
};

/**
 * Renderiza o blueprint técnico CAD em vista superior específico da arquitetura do chassi,
 * integrado ao fundo escuro via mix-blend-screen e máscara radial suave.
 */
export function CarBlueprintSvg({
  architecture,
  className = 'w-52 sm:w-60 h-auto',
}: CarBlueprintSvgProps) {
  const asset = BLUEPRINT_ASSETS[architecture] ?? BLUEPRINT_ASSETS['front-gt'];

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <img
        src={asset.src}
        alt={asset.alt}
        loading="lazy"
        className="w-full h-auto object-contain mix-blend-screen opacity-95 pointer-events-none"
        style={{
          maskImage: 'radial-gradient(ellipse 78% 82% at 50% 50%, black 62%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 78% 82% at 50% 50%, black 62%, transparent 100%)',
        }}
      />
    </div>
  );
}

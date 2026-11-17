import { motion } from 'framer-motion';

interface ApexErrorIllustrationProps {
  code: string;
  headline?: string;
}

export function ApexErrorIllustration({
  code,
  headline = 'Ops!',
}: ApexErrorIllustrationProps) {
  const digits = code.slice(0, 3).split('');

  return (
    <div className="relative flex flex-col items-center justify-center select-none pt-2 pb-1">
      {/* Halo atmosférico vermelho sutil atrás do número */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 w-64 h-40 rounded-full bg-[#FF1717]/15 blur-[64px]"
      />

      {/* "Ops!" superior */}
      <motion.span
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative z-10 text-xl sm:text-2xl font-medium tracking-tight text-white/85 mb-1"
      >
        {headline}
      </motion.span>

      {/* Dígitos grandes desalinhados no estilo da composição */}
      <div
        aria-hidden="true"
        className="relative z-10 flex items-end justify-center gap-1 sm:gap-2 leading-none -mb-11 sm:-mb-12"
      >
        {digits.map((digit, index) => {
          const tiltClass =
            index === 0
              ? '-rotate-6 translate-y-1'
              : index === 1
              ? 'rotate-2 -translate-y-1 text-[#FF1717]'
              : 'rotate-6 translate-y-1.5';

          return (
            <motion.span
              key={`${digit}-${index}`}
              initial={{ opacity: 0, y: 12, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.06, duration: 0.4 }}
              className={`text-[84px] sm:text-[108px] font-bold tracking-tighter leading-[0.88] drop-shadow-[0_14px_28px_rgba(0,0,0,0.65)] ${
                index === 1 ? 'text-[#FF1717]' : 'text-white'
              } ${tiltClass}`}
            >
              {digit}
            </motion.span>
          );
        })}
      </div>

      {/* Mascote Apex Pit-Bot sentado/avariado em SVG animado */}
      <motion.svg
        viewBox="0 0 340 245"
        className="relative z-20 w-[250px] sm:w-[295px] h-auto overflow-visible"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        role="img"
        aria-label={`Ilustração de erro ${code}`}
      >
        <defs>
          <linearGradient id="pitbot-head" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#263047" />
            <stop offset="100%" stopColor="#141926" />
          </linearGradient>
          <linearGradient id="pitbot-body" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1F273B" />
            <stop offset="100%" stopColor="#111622" />
          </linearGradient>
          <linearGradient id="pitbot-limb" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2D3852" />
            <stop offset="100%" stopColor="#182032" />
          </linearGradient>
          <radialGradient id="floor-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.65" />
            <stop offset="70%" stopColor="#000000" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Sombra no chão */}
        <ellipse cx="170" cy="224" rx="116" ry="15" fill="url(#floor-shadow)" />

        {/* Roda slick caída ao lado direito */}
        <g transform="translate(262, 198) rotate(18)">
          <ellipse cx="0" cy="0" rx="22" ry="12" fill="#0A0D13" />
          <ellipse cx="0" cy="-3" rx="20" ry="10.5" fill="#171C28" />
          <ellipse cx="0" cy="-3" rx="13" ry="6.5" fill="#0B0E14" />
          <ellipse cx="0" cy="-3" rx="10" ry="5" stroke="#FF1717" strokeWidth="1.5" fill="none" />
          <circle cx="0" cy="-3" r="2.2" fill="#FF1717" />
        </g>

        {/* Pernas sentadas esticadas */}
        {/* Perna esquerda */}
        <g>
          <path
            d="M 142 184 L 96 208"
            stroke="#27314A"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <circle cx="118" cy="196" r="4.5" fill="#3B4766" />
          <g transform="translate(76, 196) rotate(-18)">
            <rect x="0" y="0" width="28" height="22" rx="6" fill="url(#pitbot-limb)" />
            <rect x="0" y="16" width="28" height="6" rx="3" fill="#FF1717" />
          </g>
        </g>

        {/* Perna direita */}
        <g>
          <path
            d="M 198 184 L 244 208"
            stroke="#27314A"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <circle cx="222" cy="196" r="4.5" fill="#3B4766" />
          <g transform="translate(236, 187) rotate(18)">
            <rect x="0" y="0" width="28" height="22" rx="6" fill="url(#pitbot-limb)" />
            <rect x="0" y="16" width="28" height="6" rx="3" fill="#FF1717" />
          </g>
        </g>

        {/* Braço esquerdo caído / tonto */}
        <g>
          <path
            d="M 122 130 Q 82 142 84 166"
            fill="none"
            stroke="#2B3650"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M 74 168 A 10 10 0 1 1 92 174"
            fill="none"
            stroke="#3C4A6B"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>

        {/* Braço direito apoiando/segurando chave */}
        <g>
          <path
            d="M 218 130 Q 256 126 264 152"
            fill="none"
            stroke="#2B3650"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M 255 154 A 10 10 0 1 0 273 150"
            fill="none"
            stroke="#3C4A6B"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>

        {/* Mola da cintura */}
        <g transform="translate(152, 174)">
          <rect x="0" y="0" width="36" height="5" rx="2.5" fill="#333E57" />
          <rect x="3" y="6" width="30" height="5" rx="2.5" fill="#FF1717" opacity="0.85" />
          <rect x="0" y="12" width="36" height="5" rx="2.5" fill="#333E57" />
        </g>

        {/* Torso com portinha aberta e engrenagens */}
        <g transform="translate(122, 118)">
          <rect x="0" y="0" width="96" height="60" rx="14" fill="url(#pitbot-body)" />
          {/* Faixa Apex superior */}
          <rect x="0" y="0" width="96" height="7" rx="3.5" fill="#FF1717" />

          {/* Compartimento interno escuro */}
          <rect x="14" y="14" width="60" height="36" rx="8" fill="#080A0F" />

          {/* Engrenagem grande girando */}
          <motion.g
            style={{ originX: '34px', originY: '31px' }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 9, ease: 'linear' }}
          >
            <circle cx="34" cy="31" r="10" fill="none" stroke="#64748B" strokeWidth="4" strokeDasharray="4 3" />
            <circle cx="34" cy="31" r="5" fill="#2A344B" />
          </motion.g>

          {/* Engrenagem vermelha menor girando ao contrário */}
          <motion.g
            style={{ originX: '54px', originY: '37px' }}
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
          >
            <circle cx="54" cy="37" r="7" fill="none" stroke="#FF1717" strokeWidth="3.2" strokeDasharray="3.5 2.5" />
            <circle cx="54" cy="37" r="3.2" fill="#FF1717" />
          </motion.g>

          {/* Portinhola aberta para a direita */}
          <path d="M 74 14 L 100 20 L 100 54 L 74 50 Z" fill="#252F45" />
          <line x1="94" y1="28" x2="94" y2="44" stroke="#FF1717" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Mola do pescoço */}
        <g transform="translate(157, 104)">
          <rect x="0" y="0" width="26" height="4" rx="2" fill="#37435E" />
          <rect x="2" y="5" width="22" height="4" rx="2" fill="#FF1717" />
          <rect x="0" y="10" width="26" height="4" rx="2" fill="#37435E" />
        </g>

        {/* Cabeça inclinada com animação sutil de "tontura" */}
        <motion.g
          style={{ originX: '170px', originY: '104px' }}
          animate={{ rotate: [-6, -3.5, -6] }}
          transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
        >
          {/* Antena de telemetria */}
          <line x1="170" y1="26" x2="176" y2="8" stroke="#475569" strokeWidth="3.5" strokeLinecap="round" />
          <motion.circle
            cx="176"
            cy="7"
            r="4.5"
            fill="#FF1717"
            animate={{ opacity: [1, 0.35, 1], scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.6 }}
          />

          {/* Protetores auriculares de pit-crew */}
          <rect x="103" y="42" width="12" height="36" rx="6" fill="#FF1717" />
          <rect x="225" y="42" width="12" height="36" rx="6" fill="#FF1717" />

          {/* Caixa da cabeça */}
          <rect x="112" y="24" width="116" height="80" rx="18" fill="url(#pitbot-head)" />
          {/* Detalhes discretos */}
          <circle cx="122" cy="34" r="2" fill="#475569" />
          <circle cx="218" cy="34" r="2" fill="#475569" />

          {/* Visor escuro */}
          <rect x="122" y="36" width="96" height="52" rx="14" fill="#080A0F" />

          {/* Olho Esquerdo — X pixelado em vermelho Apex */}
          <g transform="translate(145, 58)">
            <circle cx="0" cy="0" r="15" fill="#131824" />
            <motion.g
              animate={{ opacity: [1, 0.65, 1] }}
              transition={{ repeat: Infinity, duration: 2.2 }}
            >
              {/* X em quadradinhos pixelados */}
              <rect x="-7" y="-7" width="4" height="4" rx="0.8" fill="#FF1717" />
              <rect x="3" y="-7" width="4" height="4" rx="0.8" fill="#FF1717" />
              <rect x="-3.5" y="-3.5" width="3.5" height="3.5" rx="0.6" fill="#FF1717" />
              <rect x="0" y="-3.5" width="3.5" height="3.5" rx="0.6" fill="#FF1717" />
              <rect x="-2" y="-2" width="4" height="4" rx="0.6" fill="#FF6B6B" />
              <rect x="-3.5" y="0" width="3.5" height="3.5" rx="0.6" fill="#FF1717" />
              <rect x="0" y="0" width="3.5" height="3.5" rx="0.6" fill="#FF1717" />
              <rect x="-7" y="3" width="4" height="4" rx="0.8" fill="#FF1717" />
              <rect x="3" y="3" width="4" height="4" rx="0.8" fill="#FF1717" />
            </motion.g>
          </g>

          {/* Olho Direito — meio fechado / sonolento */}
          <g transform="translate(195, 58)">
            <circle cx="0" cy="0" r="15" fill="#131824" />
            {/* Pupila */}
            <circle cx="0" cy="3" r="6" fill="#E2E8F0" />
            <circle cx="1.5" cy="4" r="2.5" fill="#080A0F" />
            {/* Pálpebra superior caída */}
            <path d="M -14 -2 A 14 14 0 0 1 14 -2 Z" fill="#1E2638" />
            <line x1="-13" y1="-2" x2="13" y2="-2" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Boquinha tristinha */}
          <path
            d="M 163 80 Q 170 74 177 80"
            fill="none"
            stroke="#64748B"
            strokeWidth="2.4"
            strokeLinecap="round"
          />

          {/* Faísca / raio discreto ao lado da cabeça */}
          <motion.path
            d="M 244 26 L 252 18 L 249 25 L 257 23 L 247 34 L 250 27 Z"
            fill="#FF1717"
            animate={{ opacity: [0.25, 1, 0.25], scale: [0.95, 1.08, 0.95] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          />
        </motion.g>
      </motion.svg>
    </div>
  );
}

export default ApexErrorIllustration;

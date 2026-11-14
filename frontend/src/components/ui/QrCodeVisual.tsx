import { useMemo, useState } from 'react';
import { QrCode } from 'lucide-react';

interface QrCodeVisualProps {
  payload: string;
  size?: number;
}

/**
 * Renderiza o QR Code oficial codificando o payload JSON completo da sessão,
 * com fallback matricial determinístico em SVG caso não haja conectividade externa.
 */
export function QrCodeVisual({ payload, size = 216 }: QrCodeVisualProps) {
  const [imgError, setImgError] = useState(false);

  const matrix = useMemo(() => {
    const dim = 29;
    const grid: boolean[][] = Array.from({ length: dim }, () => Array(dim).fill(false));

    const drawFinder = (r0: number, c0: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const border = r === 0 || r === 6 || c === 0 || c === 6;
          const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          grid[r0 + r][c0 + c] = border || inner;
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, dim - 7);
    drawFinder(dim - 7, 0);

    // Alignment pattern próximo ao canto inferior direito
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const isEdge = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
        grid[dim - 7 + r][dim - 7 + c] = isEdge;
      }
    }

    // Timing patterns
    for (let i = 8; i < dim - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // Hash determinístico FNV-1a sobre o payload assinado para os módulos de dados
    let seed = 0x811c9dc5;
    for (let i = 0; i < payload.length; i++) {
      seed ^= payload.charCodeAt(i);
      seed = Math.imul(seed, 0x01000193);
    }

    for (let r = 0; r < dim; r++) {
      for (let c = 0; c < dim; c++) {
        const inTopLeft = r < 8 && c < 8;
        const inTopRight = r < 8 && c >= dim - 8;
        const inBottomLeft = r >= dim - 8 && c < 8;
        const inTiming = r === 6 || c === 6;
        const inAlign = r >= dim - 9 && r <= dim - 5 && c >= dim - 9 && c <= dim - 5;
        if (inTopLeft || inTopRight || inBottomLeft || inTiming || inAlign) continue;

        seed ^= (r * 31 + c * 17) ^ payload.charCodeAt((r * dim + c) % Math.max(1, payload.length));
        seed = Math.imul(seed, 0x01000193);
        grid[r][c] = ((seed >>> 16) & 1) === 1;
      }
    }

    return grid;
  }, [payload]);

  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&margin=12&ecc=M&data=${encodeURIComponent(
    payload
  )}`;

  return (
    <div
      className="relative bg-white rounded-2xl p-3.5 shadow-[0_0_35px_rgba(255,255,255,0.08)] border border-white/20 flex items-center justify-center"
      style={{ width: size + 28, height: size + 28 }}
    >
      {!imgError ? (
        <img
          src={qrApiUrl}
          alt="QR Code Credencial FIA Paddock Pass"
          width={size}
          height={size}
          onError={() => setImgError(true)}
          className="rounded-lg object-contain block"
        />
      ) : (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${matrix.length} ${matrix.length}`}
          role="img"
          aria-label="QR Code Matricial FIA Paddock Pass"
          className="rounded-md"
        >
          <rect width={matrix.length} height={matrix.length} fill="#FFFFFF" />
          {matrix.map((row, r) =>
            row.map((on, c) =>
              on ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#08090C" /> : null
            )
          )}
        </svg>
      )}
      <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#08090C] border border-white/15 flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-white/80 whitespace-nowrap">
        <QrCode size={10} className="text-[#FF1717]" />
        <span>FIA PASS V2</span>
      </div>
    </div>
  );
}

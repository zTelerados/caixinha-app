interface SigilProps {
  size?: number;
  tone?: 'ink' | 'indigo';
  className?: string;
}

/**
 * "T" estilizado com seta ascendente — sigilo da identidade Thiago 2.0.
 * Editorial, geométrico, sem nada de decorativo.
 */
export function Sigil({ size = 32, tone = 'ink', className }: SigilProps) {
  const stroke = tone === 'indigo' ? 'var(--c-indigo)' : 'var(--c-ink)';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect x="0.5" y="0.5" width="31" height="31" rx="6" stroke={stroke} strokeOpacity="0.2" />
      {/* T horizontal */}
      <path d="M7 9 L25 9" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      {/* haste */}
      <path d="M16 9 L16 22" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      {/* seta */}
      <path d="M16 23 L16 27 M13 25 L16 22 L19 25" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

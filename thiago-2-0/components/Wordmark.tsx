interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES = {
  sm: { thiago: 'text-base', two: 'text-base' },
  md: { thiago: 'text-2xl', two: 'text-2xl' },
  lg: { thiago: 'text-4xl', two: 'text-4xl' },
  xl: { thiago: 'text-6xl', two: 'text-6xl' },
};

export function Wordmark({ size = 'md', className }: WordmarkProps) {
  const s = SIZES[size];
  return (
    <span className={`inline-flex items-baseline gap-1 ${className ?? ''}`}>
      <span className={`font-display ${s.thiago} text-ink`}>Thiago</span>
      <span className={`font-italic-display ${s.two} text-indigo`}>2.0</span>
    </span>
  );
}

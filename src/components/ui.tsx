import { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';

// Shared form primitives, Codex-styled (spec §2). The Mordheim Manager build
// screens lean on a small `ui` module (Button/TextField/Select); this is the
// Mord Hive equivalent so those screens vendor across with only class-name
// swaps. Black-on-plate, steel borders, Oxanium chrome, 48px touch targets.

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'default' | 'dense';
  fullWidth?: boolean;
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'default',
  fullWidth = true,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const base =
    'ordo-button font-ui uppercase tracking-[0.06em] inline-flex items-center justify-center border-2 disabled:opacity-40 disabled:cursor-not-allowed';
  const sizing = size === 'dense' ? 'px-3 py-1.5 min-h-[44px] text-sm' : 'px-4 py-2 min-h-[48px]';
  const width = fullWidth ? 'w-full' : '';
  const variants: Record<string, string> = {
    primary: 'bg-brass text-page border-brass hover:opacity-90',
    secondary: 'bg-transparent text-brass-text border-brass hover:bg-brass/10',
    danger: 'bg-wax text-on-accent border-wax hover:opacity-90',
  };
  return (
    <button className={`${base} ${sizing} ${width} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function TextField({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full min-h-[48px] bg-plate border-2 border-steel px-3 text-ink placeholder:text-ink-faded focus:outline-none focus:border-banner ${className}`}
      {...rest}
    />
  );
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full min-h-[48px] bg-plate border-2 border-steel px-3 text-ink focus:outline-none focus:border-banner ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}

type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> & {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  ariaLabel?: string;
};

/** A directly-typeable numeric field (spec §2.6 / MM §5.4). Clamps to `min`. */
export function NumberInput({ value, onChange, min = 0, ariaLabel, className = '', ...rest }: NumberInputProps) {
  return (
    <input
      type="number"
      inputMode="numeric"
      aria-label={ariaLabel}
      value={Number.isNaN(value) ? '' : value}
      min={min}
      onChange={(e) => {
        const next = parseInt(e.target.value, 10);
        onChange(Number.isNaN(next) ? min : Math.max(min, next));
      }}
      className={`w-full min-h-[48px] bg-plate border-2 border-steel px-3 text-ink tabular-nums focus:outline-none focus:border-banner ${className}`}
      {...rest}
    />
  );
}

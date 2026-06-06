/** @type {import('tailwindcss').Config} */
/** Variáveis CSS em hexadecimal — ver `src/index.css` */
function colorVar(name) {
  return `var(${name})`;
}

/** @type {import('tailwindcss').Config['plugins']} */
function scrollbarPlugin({ addUtilities }) {
  addUtilities({
    '.custom-scrollbar::-webkit-scrollbar': { width: '8px' },
    '.custom-scrollbar::-webkit-scrollbar-track': { background: 'transparent' },
    '.custom-scrollbar::-webkit-scrollbar-thumb': {
      backgroundColor: 'var(--color-skeleton)',
      borderRadius: '9999px',
    },
    '.custom-scrollbar::-webkit-scrollbar-thumb:hover': {
      backgroundColor: 'var(--color-border)',
    },
  });
}

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  /** Só a classe `.dark` no `<html>` — alinhado com ThemeContext (preferência explícita do utilizador). */
  darkMode: 'class',
  safelist: [
    'bg-background',
    'bg-surface',
    'dark:bg-slate-900',
    'dark:bg-slate-950',
    'dark:border-slate-800',
    'border-blue-600/40',
    'bg-blue-600/20',
    'text-blue-600',
    'bg-surface-muted',
    'bg-surface-hover',
    'bg-table-header',
    'border-border',
    'border-border-subtle',
    'text-foreground',
    'text-foreground-muted',
    'text-table-header-text',
    'bg-primary-a10',
    'text-primary',
    'border-transparent',
    'border-primary-a30',
    'hover:bg-surface-hover',
    '[&_svg]:stroke-primary',
    '[&_svg]:text-primary',
    '[&_svg]:stroke-current',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: colorVar('--color-primary'),
          hover: colorVar('--color-primary-hover'),
          a5: colorVar('--color-primary-a5'),
          a6: colorVar('--color-primary-a6'),
          a7: colorVar('--color-primary-a7'),
          a10: colorVar('--color-primary-a10'),
          a15: colorVar('--color-primary-a15'),
          a20: colorVar('--color-primary-a20'),
          a25: colorVar('--color-primary-a25'),
          a30: colorVar('--color-primary-a30'),
          a35: colorVar('--color-primary-a35'),
          a40: colorVar('--color-primary-a40'),
          a50: colorVar('--color-primary-a50'),
        },
        background: colorVar('--color-background'),
        surface: {
          DEFAULT: colorVar('--color-surface'),
          muted: colorVar('--color-surface-muted'),
          hover: colorVar('--color-surface-hover'),
          inset: colorVar('--color-surface-inset'),
          a50: colorVar('--color-surface-a50'),
          a70: colorVar('--color-surface-a70'),
          a95: colorVar('--color-surface-a95'),
        },
        foreground: {
          DEFAULT: colorVar('--color-foreground'),
          muted: colorVar('--color-foreground-muted'),
          inverse: colorVar('--color-foreground-inverse'),
          icon: colorVar('--color-foreground-icon'),
          'icon-muted': colorVar('--color-foreground-icon-muted'),
        },
        border: {
          DEFAULT: colorVar('--color-border'),
          subtle: colorVar('--color-border-subtle'),
        },
        'table-header': {
          DEFAULT: colorVar('--color-table-header'),
          text: colorVar('--color-table-header-text'),
        },
        danger: {
          DEFAULT: colorVar('--color-danger'),
          muted: colorVar('--color-danger-muted'),
          text: colorVar('--color-danger-text'),
          a40: colorVar('--color-danger-a40'),
        },
        success: {
          DEFAULT: colorVar('--color-success'),
          muted: colorVar('--color-success-muted'),
          text: colorVar('--color-success-text'),
        },
        warning: {
          DEFAULT: colorVar('--color-warning'),
          muted: colorVar('--color-warning-muted'),
          text: colorVar('--color-warning-text'),
        },
        info: {
          DEFAULT: colorVar('--color-info'),
          muted: colorVar('--color-info-muted'),
          text: colorVar('--color-info-text'),
        },
        neutral: {
          muted: colorVar('--color-neutral-muted'),
          text: colorVar('--color-neutral-text'),
        },
        skeleton: colorVar('--color-skeleton'),
        'switch-off': colorVar('--color-switch-off'),
        overlay: {
          DEFAULT: colorVar('--color-overlay'),
          a15: colorVar('--color-overlay-a15'),
          a45: colorVar('--color-overlay-a45'),
        },
      },
      borderRadius: {
        xl: '12px',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95) translateY(10px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        slideInFromRight: {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        modalDrawerIn: {
          from: { opacity: '0', transform: 'translateX(100%)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        modalDialogIn: {
          from: { opacity: '0', transform: 'scale(0.96) translateY(8px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-right': 'slideInFromRight 0.3s ease-out forwards',
        'modal-drawer': 'modalDrawerIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'modal-dialog': 'modalDialogIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [scrollbarPlugin],
};

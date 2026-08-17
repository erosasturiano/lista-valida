/* Tailwind config for the frontend react app. This is where the app theme should be defined: https://v2.tailwindcss.com/docs/configuration. */
import type { Config } from 'tailwindcss'
import animatePlugin from 'tailwindcss-animate'
import typographyPlugin from '@tailwindcss/typography'
import aspectRatioPlugin from '@tailwindcss/aspect-ratio'

export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter var', 'SF Pro Display', 'system-ui', 'sans-serif'],
        display: ['SF Pro Display', 'Inter var', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Paleta da marca Lista Valida. Cores novas e aditivas: nao alteram
        // os tokens existentes (primary, accent etc.), entao o restante do
        // app continua com a aparencia atual.
        brand: {
          // Escalas 50-900 geradas a partir dos hex oficiais, ancorados no
          // 600. Os passos claros existem porque fundos escuros (painel do
          // login, sidebar) precisam de tons legiveis - #1800AD tem 34% de
          // luminosidade e sumiria sobre eles.
          blue: {
            DEFAULT: '#1800AD', // azul do icone/documento - cor principal
            50: '#f2f0ff',
            100: '#e4e0ff',
            200: '#cac2ff',
            300: '#a89bfd',
            400: '#7560fb',
            500: '#2e0efb',
            600: '#1800AD',
            700: '#140094',
            800: '#100075',
            900: '#0c0057',
            950: '#08003d',
          },
          navy: {
            DEFAULT: '#261B6E', // azul-marinho do "V" - apoio
            50: '#f4f3fc',
            100: '#e9e6f9',
            200: '#d3cef3',
            300: '#b6aeea',
            400: '#8b7edd',
            500: '#503ccd',
            600: '#261B6E',
            700: '#20175e',
            800: '#19124a',
            900: '#140e39',
            950: '#0d0925',
          },
          gold: {
            DEFAULT: '#AD9600', // dourado - destaque pontual
            50: '#fffdf0',
            100: '#fffbe0',
            200: '#fff7c2',
            300: '#fdf09b',
            400: '#fbe660',
            500: '#fbdc0e',
            600: '#AD9600',
            700: '#948000',
            800: '#756600',
            900: '#574b00',
            950: '#3d3500',
          },
          ink: '#1D1A33', // quase preto azulado - texto
          olive: '#58511D', // oliva escuro - destaque secundario
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      transitionProperty: {
        width: 'width',
        height: 'height',
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        elevation: '0 4px 20px rgba(0, 0, 0, 0.05)',
      },
      transitionTimingFunction: {
        apple: 'cubic-bezier(0.42, 0, 0.58, 1)',
      },
    },
  },
  plugins: [animatePlugin, typographyPlugin, aspectRatioPlugin],
} satisfies Config

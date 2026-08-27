export const colors = {
  brand: '#C8813A',
  brandDark: '#B5712E',
  bg: '#F7F2EA',
  bgCard: '#FDFAF5',
  ink: '#3D2B1F',
  inkMuted: '#7A5C44',
  inkFaint: '#9A8070',
  border: 'rgba(61,43,31,.1)',
  errorBg: '#FEF2F2',
  errorBorder: '#FCA5A5',
  errorInk: '#991B1B',
  alert: '#A32D2D',
  statusPrint: '#5880B8',
  statusShip: '#6A9E78',
  statusShipInk: '#3A6A48',
  memorial: '#8B6B4A',
} as const;

export const typography = {
  display: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 'clamp(2.1rem, 4vw, 4rem)',
    fontWeight: 600,
    lineHeight: 1.1,
  },
  headline: {
    fontFamily: 'Georgia, serif',
    fontSize: 'clamp(2rem, 4vw, 3rem)',
    fontWeight: 600,
    lineHeight: 1.15,
  },
  title: {
    fontFamily: 'Georgia, serif',
    fontSize: '1.1rem',
    fontWeight: 600,
    lineHeight: 1.3,
  },
  body: {
    fontFamily: "'DM Sans', -apple-system, sans-serif",
    fontSize: '1rem',
    fontWeight: 300,
    lineHeight: 1.7,
  },
  label: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.72rem',
    fontWeight: 500,
    lineHeight: 1.4,
    letterSpacing: '0.06em',
  },
} as const;

export const radius = {
  sm: '8px',
  md: '14px',
  lg: '20px',
  pill: '100px',
} as const;

export const spacing = {
  xs: '8px',
  sm: '12px',
  md: '16px',
  lg: '24px',
  xl: '40px',
} as const;

export const shadows = {
  sm: '0 2px 8px rgba(61,43,31,.08)',
  md: '0 8px 24px rgba(61,43,31,.12)',
  lg: '0 16px 48px rgba(61,43,31,.16)',
} as const;

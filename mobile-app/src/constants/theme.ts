export const theme = {
  colors: {
    // Paleta institucional basada en el logo (#3CD6FC, #0475EF, #091B3B) y blanco
    primary: '#0475EF',
    primaryDark: '#091B3B',
    primarySoft: '#E2F9FE', // Tinte al 15 % de #3CD6FC
    onPrimary: '#FFFFFF', // Texto e iconos sobre fondo primary
    surface: '#FFFFFF',
    background: '#F7F7F7',
    border: '#E8E5E5',
    textMain: '#252525',
    textMuted: '#777777',

    // Paleta Modo Oscuro (WCAG AAA)
    dark: {
      primary: '#3CD6FC',
      primaryDark: '#0475EF',
      primarySoft: '#091B3B',
      onPrimary: '#091B3B', // El blanco sobre #3CD6FC no alcanza contraste legible
      surface: '#1E293B',
      background: '#0F172A',
      border: '#334155',
      textMain: '#FFFFFF',
      textMuted: '#94A3B8',
    }
  },
  radius: {
    badge: 4,
    field: 6,
    button: 8,
    card: 8,
    informarBtn: 10,
  },
  touchTarget: {
    minSize: 56, // Mínimo accesible 56dp
  },
  // Mismas duraciones que NEXO MAP Admin Web (08 §6.2): color de botones y apertura de modales.
  motion: {
    press: 150,
    fade: 150,
    modal: 200,
  },
  overlay: {
    backdrop: 'rgba(37, 37, 37, 0.4)',
  },
};

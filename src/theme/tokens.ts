/**
 * Every visual value for Campfire lives here.
 * Skins swap colors only. Type, line, grain, and motion stay put
 * so a future skin does not invent a second design.
 */

export const skins = {
  campfire: {
    background: '#14110F',
    text: '#EDE6DA',
    muted: '#8C8278',
    inTune: '#E8A33D',
    off: '#B5533C',
  },
  bright: {
    background: '#F3EEE4',
    text: '#1F1B17',
    muted: '#8C8278',
    inTune: '#E8A33D',
    off: '#B5533C',
  },
  shamanic: {
    background: '#1B1A14',
    text: '#C9A55A',
    muted: '#6E7B5B',
    inTune: '#E8A33D',
    off: '#B5533C',
  },
} as const;

export type SkinName = keyof typeof skins;

export const tokens = {
  font: {
    hero: '"Fraunces Variable", "Iowan Old Style", Palatino, serif',
    label: '"IBM Plex Mono", ui-monospace, monospace',
    heroSize: 'clamp(4.75rem, min(32vw, 22vh), 10.5rem)',
    labelSize: '0.8125rem',
    heroWeight: 560,
    heroSoft: 38,
    heroWonk: 1,
    heroOpticalSize: 144,
  },
  line: 1.75,
  grain: 0.03,
  motion: {
    /** How hard the needle chases the pitch each frame. No overshoot. */
    needleFollow: 0.11,
    inTuneMs: 480,
    breathMs: 2800,
    fadeMs: 420,
  },
} as const;

export function applySkin(name: SkinName = 'campfire'): void {
  const skin = skins[name];
  const root = document.documentElement;
  const vars: Record<string, string> = {
    '--bg': skin.background,
    '--ink': skin.text,
    '--muted': skin.muted,
    '--ember': skin.inTune,
    '--clay': skin.off,
    '--font-hero': tokens.font.hero,
    '--font-label': tokens.font.label,
    '--size-hero': tokens.font.heroSize,
    '--size-label': tokens.font.labelSize,
    '--line': `${tokens.line}px`,
    '--grain': String(tokens.grain),
    '--ease-intune': `${tokens.motion.inTuneMs}ms`,
    '--breath': `${tokens.motion.breathMs}ms`,
    '--fade': `${tokens.motion.fadeMs}ms`,
    '--hero-weight': String(tokens.font.heroWeight),
    '--hero-soft': String(tokens.font.heroSoft),
    '--hero-wonk': String(tokens.font.heroWonk),
    '--hero-opsz': String(tokens.font.heroOpticalSize),
  };
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  root.style.background = skin.background;
  root.dataset.skin = name;
}

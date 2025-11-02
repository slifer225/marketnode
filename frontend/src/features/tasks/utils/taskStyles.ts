export const PRIORITY_COLORS: Record<number, string> = {
  1: '#ff3707',
  2: '#ffa716',
  3: '#fff631',
  4: '#63ff2c',
  5: '#c6ff97',
};

export const EXPIRED_COLOR = '#ff3707';

export const getPriorityColor = (priority: number): string =>
  PRIORITY_COLORS[priority] ?? PRIORITY_COLORS[5];

export const hexToRgba = (hex: string, alpha: number): string => {
  const normalized = hex.replace('#', '');
  const bigint = Number.parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

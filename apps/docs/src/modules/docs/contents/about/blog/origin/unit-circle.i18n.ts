import type { Lang } from '@/i18n';

export const unitCircleI18n: Record<
  Lang,
  Readonly<Record<'angle' | 'radians' | 'sin' | 'sinHint' | 'cos' | 'cosHint' | 'tan' | 'tanHint', string>>
> = {
  zh: {
    angle: '角 α = 30°',
    radians: '即 π/6 弧度',
    sin: 'sin α = 1/2',
    sinHint: '（红线长度）',
    cos: 'cos α = √3/2',
    cosHint: '（蓝线长度）',
    tan: 'tan α = 1/√3',
    tanHint: '（橙线长度）',
  },
  en: {
    angle: 'angle α = 30°',
    radians: '(π/6 in radians)',
    sin: 'sin α = 1/2',
    sinHint: '(length of red line)',
    cos: 'cos α = √3/2',
    cosHint: '(length of dodgerblue line)',
    tan: 'tan α = 1/√3',
    tanHint: '(length of darkorange line)',
  },
};

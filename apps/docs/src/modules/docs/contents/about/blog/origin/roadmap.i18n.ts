import type { Lang } from '@/i18n';

export const roadmapI18n: Record<
  Lang,
  Readonly<Record<'current' | 'future' | 'primitives' | 'positioning' | 'libraries', string>>
> = {
  zh: {
    current: 'v0.1（当前）',
    future: '未来',
    primitives: '基础图元',
    positioning: '高级定位',
    libraries: 'libraries',
  },
  en: {
    current: 'v0.1 (current)',
    future: 'future',
    primitives: 'primitives',
    positioning: 'positioning',
    libraries: 'libraries',
  },
};

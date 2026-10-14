import type { Lang } from '@/i18n';

/** 坐标案例中的节点文案 */
export const coordinateExampleI18n: Record<
  Lang,
  Record<'outer' | 'inner' | 'following' | 'nested' | 'aligned', string>
> = {
  zh: { outer: '外层 A', inner: '内层 A', following: 'B', nested: 'C', aligned: '对齐节点 D' },
  en: { outer: 'Outer A', inner: 'Inner A', following: 'B', nested: 'C', aligned: 'Aligned D' },
};

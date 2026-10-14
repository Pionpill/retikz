import type { Lang } from '@/i18n';

/** Scope 自身原点与包络锚点的定位对照 */
export const scopePlacementI18n: Record<Lang, Record<'origin' | 'anchor' | 'target' | 'self', string>> = {
  zh: {
    origin: '原点定位\nposition: [140, 0]',
    anchor: '包络定位\nselfAnchor: left',
    target: '目标点',
    self: 'Scope 左锚点',
  },
  en: {
    origin: 'Place the origin\nposition: [140, 0]',
    anchor: 'Place the envelope\nselfAnchor: left',
    target: 'Target point',
    self: 'Scope left anchor',
  },
};

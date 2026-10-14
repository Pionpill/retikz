import type { Lang } from '@/i18n';

/** 相同数值偏移在不同空间下的说明 */
export const coordinateSpacesI18n: Record<Lang, Record<'local' | 'world' | 'origin' | 'scale', string>> = {
  zh: {
    local: '局部偏移 [40, 0]\n世界点 [180, 50]',
    world: '世界偏移 [40, 0]\n世界点 [140, 50]',
    origin: '共同基点 [100, 50]',
    scale: 'Scope：位置 [100, 50] · 缩放 2',
  },
  en: {
    local: 'Local offset [40, 0]\nWorld point [180, 50]',
    world: 'World offset [40, 0]\nWorld point [140, 50]',
    origin: 'Shared base [100, 50]',
    scale: 'Scope: position [100, 50] · scale 2',
  },
};

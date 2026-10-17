import type { Lang } from '@/i18n';

/** 编译产物示意图文案 */
export const outputSpatialI18n: Record<Lang, { local: string; world: string; shift: string; note: string }> = {
  zh: {
    local: '局部声明',
    world: '世界空间',
    shift: '平移 [20, 30]',
    note: '相同区域，保留大小与 owner 身份',
  },
  en: {
    local: 'Local declaration',
    world: 'World space',
    shift: 'Translate [20, 30]',
    note: 'Same region, size and owner identity',
  },
};

import type { Lang } from '@/i18n';

/** Node 编译流程图的双语文案 */
export const compilationNodeI18n: Record<Lang, Record<'resolution' | 'geometry' | 'primitives', string>> = {
  zh: {
    resolution: 'NodeResolution\nCanonicalNode（含 paint）\n及形状、边界',
    geometry: 'CompiledNodeLayout\ngeometry + text + labels',
    primitives: 'Scene 图元\n本例：Group（矩形 + 文字）',
  },
  en: {
    resolution: 'NodeResolution\nCanonicalNode (with paint)\n+ shape, boundary',
    geometry: 'CompiledNodeLayout\ngeometry + text + labels',
    primitives: 'Scene primitives\nHere: Group (rectangle + text)',
  },
};

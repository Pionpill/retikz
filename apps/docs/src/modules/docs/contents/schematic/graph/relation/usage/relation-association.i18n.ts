import type { Lang } from '@/i18n';

/** 关系示例与控制面板文案 */
export const relationAssociationI18n: Record<Lang, { controls: Array<string>; source: string; target: string }> = {
  zh: {
    controls: ['Relation：关联', '语义与展示', '语义方向', '无方向', '双向', 'Relation 主色'],
    source: '对象 A',
    target: '对象 B',
  },
  en: {
    controls: [
      'Relation: Association',
      'Semantics and presentation',
      'Semantic direction',
      'None',
      'Both',
      'Relation color',
    ],
    source: 'Object A',
    target: 'Object B',
  },
};

import type { Lang } from '@/i18n';
/** 关系示例与控制面板文案 */
export const relationInfluenceI18n: Record<Lang, { controls: Array<string>; source: string; target: string }> = {
  zh: {
    controls: ['Relation：影响', '语义与展示', '语义方向', '双向', 'Relation 主色'],
    source: '因素',
    target: '结果',
  },
  en: {
    controls: ['Relation: Influence', 'Semantics and presentation', 'Semantic direction', 'Both', 'Relation color'],
    source: 'Factor',
    target: 'Outcome',
  },
};

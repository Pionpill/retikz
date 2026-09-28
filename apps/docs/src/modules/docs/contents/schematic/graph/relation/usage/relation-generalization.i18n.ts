import type { Lang } from '@/i18n';
/** 关系示例与控制面板文案 */
export const relationGeneralizationI18n: Record<Lang, { controls: Array<string>; source: string; target: string }> = {
  zh: {
    controls: ['Relation：泛化', '语义与展示', 'Relation 主色'],
    source: '子类型',
    target: '父类型',
  },
  en: {
    controls: ['Relation: Generalization', 'Semantics and presentation', 'Relation color'],
    source: 'Subtype',
    target: 'Supertype',
  },
};

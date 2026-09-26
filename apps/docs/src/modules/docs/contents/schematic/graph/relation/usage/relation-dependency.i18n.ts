import type { Lang } from '@/i18n';
/** 关系示例与控制面板文案 */
export const relationDependencyI18n: Record<Lang, { controls: Array<string>; source: string; target: string }> = {
  zh: {
    controls: ['Relation：依赖', '语义与展示', 'Relation 主色'],
    source: '依赖方',
    target: '被依赖方',
  },
  en: {
    controls: ['Relation: Dependency', 'Semantics and presentation', 'Relation color'],
    source: 'Dependent',
    target: 'Dependency',
  },
};

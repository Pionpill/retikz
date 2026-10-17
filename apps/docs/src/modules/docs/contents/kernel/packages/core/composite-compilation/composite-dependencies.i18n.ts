import type { Lang } from '@/i18n';

/** 依赖装配图文案；节选 Chart 对 FlexLayout 的依赖 */
export const compositeDependenciesI18n: Record<
  Lang,
  { roots: string; providers: string; registry: string; instance: string; order: string; lookup: string; note: string }
> = {
  zh: {
    roots: '根依赖',
    providers: '提供者依赖关系（节选）',
    registry: '复合 Definition 注册表（节选）',
    instance: '散点图声明',
    order: '先布局，后 Chart',
    lookup: '按 namespace.type 查找',
    note: '装配准备定义\n遍历时再绑定实例',
  },
  en: {
    roots: 'Root dependencies',
    providers: 'Provider dependencies (excerpt)',
    registry: 'Composite Definitions (excerpt)',
    instance: 'Scatter chart declaration',
    order: 'Layout before Chart',
    lookup: 'Look up namespace.type',
    note: 'Assembly prepares definitions\nTraversal binds instances',
  },
};

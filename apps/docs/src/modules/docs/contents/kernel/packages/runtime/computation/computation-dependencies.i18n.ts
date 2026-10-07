import type { Lang } from '@/i18n';

/** 依赖字段与读取入口的双语文案 */
export const computationDependenciesI18n: Record<
  Lang,
  { position: string; distance: string; label: string; first: string; second: string }
> = {
  zh: {
    position: 'position · 来源\n[3, 4]',
    distance: 'distance · 计算\n结果 5',
    label: 'label · 计算\n结果 "Distance: 5"',
    first: 'sources: [position]\nview.snapshot(position)',
    second: 'computations: [distance]\nview.result(distance)',
  },
  en: {
    position: 'position · Source\n[3, 4]',
    distance: 'distance · Computation\nResult: 5',
    label: 'label · Computation\nResult: "Distance: 5"',
    first: 'sources: [position]\nview.snapshot(position)',
    second: 'computations: [distance]\nview.result(distance)',
  },
};

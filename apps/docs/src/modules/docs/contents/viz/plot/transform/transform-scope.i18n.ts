import type { Lang } from '@/i18n';

/** 作用域示例图形与控件的文案 */
export const transformScopeI18n: Record<
  Lang,
  {
    title: string;
    data: string;
    rows: string;
    source: string;
    layerA: string;
    layerB: string;
    operation: string;
    scope: string;
    root: string;
    local: string;
    amount: string;
    axis: string;
  }
> = {
  zh: {
    title: '变换作用域',
    data: '数据',
    rows: '两层点的数据',
    source: '原始数据',
    layerA: '图层 A 结果',
    layerB: '图层 B 结果',
    operation: '扰动',
    scope: '作用域',
    root: '根级：两层一起变化',
    local: '局部：只改变图层 B',
    amount: '扰动幅度',
    axis: '横向位置',
  },
  en: {
    title: 'Transform scope',
    data: 'Data',
    rows: 'Data for both layers',
    source: 'Source data',
    layerA: 'Layer A result',
    layerB: 'Layer B result',
    operation: 'Jitter',
    scope: 'Scope',
    root: 'Root: change both layers',
    local: 'Local: change only layer B',
    amount: 'Jitter amount',
    axis: 'Horizontal position',
  },
};

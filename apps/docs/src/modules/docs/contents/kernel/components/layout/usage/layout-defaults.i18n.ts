import type { Lang } from '@/i18n';

/** 全图默认值示例的面板文案 */
export const layoutDefaultsI18n: Record<
  Lang,
  {
    title: string;
    shared: string;
    node: string;
    stroke: string;
    strokeWidth: string;
    opacity: string;
    fill: string;
    padding: string;
  }
> = {
  zh: {
    title: '全图默认值',
    shared: '所有 Node 与 Path',
    node: '所有 Node',
    stroke: '描边颜色',
    strokeWidth: '描边宽度',
    opacity: '不透明度',
    fill: '填充颜色',
    padding: '内边距',
  },
  en: {
    title: 'Whole-figure defaults',
    shared: 'All Nodes and Paths',
    node: 'All Nodes',
    stroke: 'Stroke color',
    strokeWidth: 'Stroke width',
    opacity: 'Opacity',
    fill: 'Fill color',
    padding: 'Padding',
  },
};

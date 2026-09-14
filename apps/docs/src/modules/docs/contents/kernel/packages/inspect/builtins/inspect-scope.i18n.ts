import type { Lang } from '@/i18n';

/** Shared drawing and controls text. */
export const inspectScopeI18n: Record<
  Lang,
  {
    title: string;
    shape: string;
    inspect: string;
    position: string;
    rotate: string;
    width: string;
    height: string;
    envelope: string;
    origin: string;
    axes: string;
    labels: string;
    target: string;
  }
> = {
  zh: {
    title: '层级',
    shape: '图形参数',
    inspect: '检查选项',
    position: '位置',
    rotate: '旋转',
    width: '子节点宽度',
    height: '子节点高度',
    envelope: '固有包络',
    origin: '局部原点',
    axes: '局部坐标轴',
    labels: '层级标签',
    target: '子节点',
  },
  en: {
    title: 'Scope',
    shape: 'Shape parameters',
    inspect: 'Inspection options',
    position: 'Position',
    rotate: 'Rotation',
    width: 'Child width',
    height: 'Child height',
    envelope: 'Intrinsic envelope',
    origin: 'Local origin',
    axes: 'Local axes',
    labels: 'Hierarchy labels',
    target: 'Child node',
  },
};

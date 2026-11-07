import type { Lang } from '@/i18n';

/** Shared drawing and controls text. */
export const inspectGroupI18n: Record<
  Lang,
  {
    title: string;
    shape: string;
    inspect: string;
    position: string;
    rotate: string;
    width: string;
    height: string;
    origin: string;
    axes: string;
    labels: string;
    target: string;
  }
> = {
  zh: {
    title: '分组坐标系',
    shape: '图形参数',
    inspect: '检查选项',
    position: '位置',
    rotate: '旋转',
    width: '子节点宽度',
    height: '子节点高度',
    origin: '局部原点',
    axes: '局部坐标轴',
    labels: '图元路径标签',
    target: '子节点',
  },
  en: {
    title: 'Group coordinates',
    shape: 'Shape parameters',
    inspect: 'Inspection options',
    position: 'Position',
    rotate: 'Rotation',
    width: 'Child width',
    height: 'Child height',
    origin: 'Local origin',
    axes: 'Local axes',
    labels: 'Primitive path labels',
    target: 'Child node',
  },
};

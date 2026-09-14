import type { Lang } from '@/i18n';

/** Shared drawing and controls text. */
export const inspectCoordinateI18n: Record<
  Lang,
  { title: string; shape: string; inspect: string; position: string; enabled: string; labels: string }
> = {
  zh: {
    title: '坐标',
    shape: '图形参数',
    inspect: '检查选项',
    position: '位置',
    enabled: '启用观测',
    labels: '显示标识',
  },
  en: {
    title: 'Coordinate',
    shape: 'Shape parameters',
    inspect: 'Inspection options',
    position: 'Position',
    enabled: 'Enable inspection',
    labels: 'Show identifier',
  },
};

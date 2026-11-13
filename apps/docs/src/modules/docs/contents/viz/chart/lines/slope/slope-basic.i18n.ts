import type { Lang } from '@/i18n';

/** 标签与点样式控件文案 */
export const slopeBasicI18n = {
  zh: {
    data: '数据',
    settings: '设置',
    point: '显示观测点',
    pointSize: '点半径',
    label: '显示标签',
    position: '标签方向',
    outward: '向外（默认）',
    top: '上方',
    bottom: '下方',
    left: '左侧',
    right: '右侧',
    distance: '标签距离',
    strokeWidth: '线宽',
  },
  en: {
    data: 'Data',
    settings: 'Settings',
    point: 'Show points',
    pointSize: 'Point radius',
    label: 'Show labels',
    position: 'Label position',
    outward: 'Outward (default)',
    top: 'Top',
    bottom: 'Bottom',
    left: 'Left',
    right: 'Right',
    distance: 'Label distance',
    strokeWidth: 'Line width',
  },
} satisfies Record<Lang, Record<string, string>>;

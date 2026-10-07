import type { Lang } from '@/i18n';

/** 示例与控件的双语文案 */
export const mapLabelsI18n = {
  zh: {
    title: '容器标签',
    position: '标签位置',
    top: '上方',
    right: '右侧',
    bottom: '下方',
    left: '左侧',
    distance: '标签距离',
    pin: '显示引线',
  },
  en: {
    title: 'Container labels',
    position: 'Label position',
    top: 'Top',
    right: 'Right',
    bottom: 'Bottom',
    left: 'Left',
    distance: 'Label distance',
    pin: 'Show pin',
  },
} satisfies Record<Lang, Record<string, string>>;

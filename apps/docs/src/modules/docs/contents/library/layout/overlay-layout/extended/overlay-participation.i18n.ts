import type { Lang } from '@/i18n';

/** 功能面板的双语文案 */
export const demoI18n = {
  zh: {
    first: '蓝色节点',
    second: '橙色节点',
    title: '尺寸参与与绘制顺序',
    participation: '第二项尺寸参与',
    participation0: '计入',
    participation1: '排除',
    zIndex: '第二项层级',
    offsetX: '第二项水平偏移',
    offsetY: '第二项垂直偏移',
  },
  en: {
    first: 'Blue node',
    second: 'Orange node',
    title: 'Size participation and paint order',
    participation: 'Second item size contribution',
    participation0: 'Include',
    participation1: 'Exclude',
    zIndex: 'Second item paint layer',
    offsetX: 'Second item horizontal offset',
    offsetY: 'Second item vertical offset',
  },
} satisfies Record<Lang, Record<string, string>>;

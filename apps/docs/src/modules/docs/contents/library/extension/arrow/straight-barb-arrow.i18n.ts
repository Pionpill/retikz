import type { Lang } from '@/i18n';

/** 面板的双语文案 */
export const demoI18n = {
  zh: {
    title: '直线倒钩箭头',
    section: '端点参数',
    length: '长度',
    width: '宽度',
    lineWidth: '描边宽度',
    color: '颜色',
  },
  en: {
    title: 'Straight-barb arrow',
    section: 'Endpoint parameters',
    length: 'Length',
    width: 'Width',
    lineWidth: 'Stroke width',
    color: 'Color',
  },
} satisfies Record<Lang, Record<string, string>>;

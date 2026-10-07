import type { Lang } from '@/i18n';

/** 示例与控件的双语文案 */
export const mapOverflowI18n = {
  zh: {
    title: '引用与溢出',
    width: '值格宽度',
    overflow: '溢出处理',
    clip: '裁切',
    visible: '保持可见',
    reference: '显示外部引用',
  },
  en: {
    title: 'References and overflow',
    width: 'Value cell width',
    overflow: 'Overflow',
    clip: 'Clip',
    visible: 'Visible',
    reference: 'Show external reference',
  },
} satisfies Record<Lang, Record<string, string>>;

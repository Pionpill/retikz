import type { Lang } from '@/i18n';

/** 示例与控件的双语文案 */
export const mapStylesI18n = {
  zh: {
    title: '样式与尺寸',
    keyWidth: '键列宽度',
    valueWidth: '值列宽度',
    local: '首个值格局部覆盖',
  },
  en: {
    title: 'Style and dimensions',
    keyWidth: 'Key width',
    valueWidth: 'Value width',
    local: 'Override the first value cell',
  },
} satisfies Record<Lang, Record<string, string>>;

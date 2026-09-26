import type { Lang } from '@/i18n';

/** 样式与尺寸试验场的双语文案 */
export const entityStyleSizeI18n: Record<
  Lang,
  {
    title: string;
    style: string;
    size: string;
    color: string;
    fill: string;
    strokeWidth: string;
    maxTextWidth: string;
    lineHeight: string;
    minimumWidth: string;
    text: string;
  }
> = {
  zh: {
    title: '样式与尺寸',
    style: '样式',
    size: '文字与尺寸',
    color: '主色',
    fill: '填充强度',
    strokeWidth: '描边宽度',
    maxTextWidth: '文字最大宽度',
    lineHeight: '行高',
    minimumWidth: '最小宽度',
    text: '检查订单并确认付款状态',
  },
  en: {
    title: 'Style and size',
    style: 'Style',
    size: 'Text and size',
    color: 'Color',
    fill: 'Fill strength',
    strokeWidth: 'Stroke width',
    maxTextWidth: 'Maximum text width',
    lineHeight: 'Line height',
    minimumWidth: 'Minimum width',
    text: 'Check the order and confirm its payment status',
  },
};

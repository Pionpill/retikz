import type { Lang } from '@/i18n';

/** 自定义通道示例与控件的双语文案 */
export const customChannelI18n: Record<
  Lang,
  {
    title: string;
    data: string;
    points: string;
    binding: string;
    source: string;
    field: string;
    constant: string;
    opacity: string;
  }
> = {
  zh: {
    title: '自定义通道',
    data: '数据',
    points: '散点数据',
    binding: '通道绑定',
    source: '取值方式',
    field: '绑定 score 字段',
    constant: '使用固定值',
    opacity: '固定透明度',
  },
  en: {
    title: 'Custom channel',
    data: 'Data',
    points: 'Points',
    binding: 'Channel binding',
    source: 'Value source',
    field: 'Bind the score field',
    constant: 'Use a constant',
    opacity: 'Constant opacity',
  },
};

import type { Lang } from '@/i18n';

/** 分类顺序示例与控件共用文案 */
export const versionOrderI18n: Record<
  Lang,
  {
    title: string;
    data: string;
    order: string;
    appearance: string;
    ascending: string;
    descending: string;
    naturalAscending: string;
    naturalDescending: string;
    length: string;
  }
> = {
  zh: {
    title: '版本顺序',
    data: '原始数据',
    order: '分类顺序',
    appearance: '出现顺序',
    ascending: '字母升序',
    descending: '字母降序',
    naturalAscending: '自然升序',
    naturalDescending: '自然降序',
    length: '自定义：标签长度',
  },
  en: {
    title: 'Version order',
    data: 'Source data',
    order: 'Category order',
    appearance: 'Appearance',
    ascending: 'Alphabetical ascending',
    descending: 'Alphabetical descending',
    naturalAscending: 'Natural ascending',
    naturalDescending: 'Natural descending',
    length: 'Custom: label length',
  },
};

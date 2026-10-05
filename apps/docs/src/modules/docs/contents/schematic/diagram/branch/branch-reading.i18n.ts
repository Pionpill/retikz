import type { Lang } from '@/i18n';

/** 阅读路线示例文案 */
export const branchReadingI18n: Record<
  Lang,
  { title: string; start: string; usage: string; extended: string; finish: string }
> = {
  zh: { title: '阅读路线', start: '简介', usage: '基础用法', extended: '延伸阅读', finish: '完整示例' },
  en: {
    title: 'Reading path',
    start: 'Introduction',
    usage: 'Basic usage',
    extended: 'Further reading',
    finish: 'Full example',
  },
};

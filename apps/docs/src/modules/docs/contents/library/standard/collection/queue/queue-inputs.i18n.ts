import type { Lang } from '@/i18n';

/** 图形与控件文案 */
export const queueI18n: Record<Lang, { title: string; input: string; empty: string; expand: string }> = {
  zh: { title: '选择输入方式', input: '输入方式', empty: '空队列', expand: '展开嵌套数据' },
  en: { title: 'Choose input', input: 'Input', empty: 'Empty queue', expand: 'Expand nested data' },
};

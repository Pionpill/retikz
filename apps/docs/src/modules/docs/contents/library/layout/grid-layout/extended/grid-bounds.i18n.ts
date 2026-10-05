import type { Lang } from '@/i18n';

/** 功能面板的双语文案 */
export const demoI18n = {
  zh: {
    title: '内容与有界轨道',
    mode: '内容测量',
    mode0: '最小内容',
    mode1: '自然内容',
    minimum: '第二列下界',
    maximum: '第二列上界',
    width: '容器宽度',
    childWidth: '节点最小宽度',
  },
  en: {
    title: 'Intrinsic and bounded tracks',
    mode: 'Content measurement',
    mode0: 'Minimum',
    mode1: 'Natural',
    minimum: 'Second column minimum',
    maximum: 'Second column maximum',
    width: 'Container width',
    childWidth: 'Node minimum width',
  },
} satisfies Record<Lang, Record<string, string>>;

import type { Lang } from '@/i18n';

/** 同一连线的输入与输出对照 */
export const pathExampleI18n: Record<Lang, { titles: Array<string>; label: string }> = {
  zh: { titles: ['中心坐标连线', '节点引用、箭头与标签'], label: '连接' },
  en: { titles: ['Center coordinates', 'Node references, arrow, label'], label: 'link' },
};

import type { Lang } from '@/i18n';

/** convex-hull 的本地化文案 */
export type ConvexHullI18n = Readonly<{
  label1: string;
  label2: string;
  label3: string;
  label4: string;
  label5: string;
  label6: string;
  label7: string;
}>;

/** 按文档语言获取 convex-hull 文案 */
export const convexHullI18n: Record<Lang, ConvexHullI18n> = {
  zh: {
    label1: '凸包',
    label2: '输入',
    label3: '点集',
    label4: '凹形点集',
    label5: '含重复与共线点',
    label6: '凹形边界',
    label7: '去重与去共线',
  },
  en: {
    label1: 'Convex hull',
    label2: 'Input',
    label3: 'Point set',
    label4: 'Concave boundary',
    label5: 'Duplicates and collinear points',
    label6: 'Concave boundary',
    label7: 'Deduplicate and remove collinear points',
  },
};

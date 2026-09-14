import type { Lang } from '@/i18n';

/** ray-arc 的本地化文案 */
export type RayArcI18n = Readonly<{
  label1: string;
  label2: string;
  label3: string;
  label4: string;
  label5: string;
  label6: string;
  label7: string;
}>;

/** 按文档语言获取 ray-arc 文案 */
export const rayArcI18n: Record<Lang, RayArcI18n> = {
  zh: {
    label1: '射线与圆弧',
    label2: '圆弧范围',
    label3: '起始角度',
    label4: '终止角度',
    label5: '两个交点',
    label6: '一个交点',
    label7: '反向扫描',
  },
  en: {
    label1: 'Ray and arc',
    label2: 'Arc range',
    label3: 'Start angle',
    label4: 'End angle',
    label5: 'Two intersections',
    label6: 'One intersection',
    label7: 'Reverse sweep',
  },
};

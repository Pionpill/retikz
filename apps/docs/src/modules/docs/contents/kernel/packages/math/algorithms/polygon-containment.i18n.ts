import type { Lang } from '@/i18n';

/** polygon-containment 的本地化文案 */
export type PolygonContainmentI18n = Readonly<{
  label1: string;
  label2: string;
  label3: string;
  label4: string;
  label5: string;
  label6: string;
  label7: string;
  label8: string;
  label9: string;
}>;

/** 按文档语言获取 polygon-containment 文案 */
export const polygonContainmentI18n: Record<Lang, PolygonContainmentI18n> = {
  zh: {
    label1: '多边形与凸包',
    label2: '输入形状',
    label3: '多边形',
    label4: '凹多边形',
    label5: '凸多边形',
    label6: '测试点',
    label7: '点 A',
    label8: '点 B',
    label9: '点 C',
  },
  en: {
    label1: 'Polygons and convex hulls',
    label2: 'Input shape',
    label3: 'Polygon',
    label4: 'Concave polygon',
    label5: 'Convex polygon',
    label6: 'Test points',
    label7: 'Point A',
    label8: 'Point B',
    label9: 'Point C',
  },
};

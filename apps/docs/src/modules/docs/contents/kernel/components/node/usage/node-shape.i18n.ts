import type { Lang } from '@/i18n';

/** node-shape 的本地化文案 */
export type NodeShapeI18n = Readonly<{
  title: string;
  section: string;
  shape: string;
  sides: string;
  rectangle: string;
  circle: string;
  ellipse: string;
  diamond: string;
  polygon: string;
}>;

/** 按文档语言获取 node-shape 文案 */
export const nodeShapeI18n: Record<Lang, NodeShapeI18n> = {
  zh: {
    title: '形状',
    section: '节点',
    shape: '形状',
    sides: '边数',
    rectangle: '矩形',
    circle: '圆形',
    ellipse: '椭圆',
    diamond: '菱形',
    polygon: '多边形',
  },
  en: {
    title: 'Shape',
    section: 'Node',
    shape: 'Shape',
    sides: 'Sides',
    rectangle: 'Rectangle',
    circle: 'Circle',
    ellipse: 'Ellipse',
    diamond: 'Diamond',
    polygon: 'Polygon',
  },
};

import type { Lang } from '@/i18n';

/** intersection-playground 的本地化文案 */
export type IntersectionPlaygroundI18n = Readonly<{
  label1: string;
  label2: string;
  label3: string;
  label4: string;
  label5: string;
  label6: string;
  label7: string;
  label8: string;
  label9: string;
  label10: string;
  label11: string;
  label12: string;
  label13: string;
  label14: string;
  label15: string;
  label16: string;
  label17: string;
  label18: string;
  label19: string;
}>;

/** 按文档语言获取 intersection-playground 文案 */
export const intersectionPlaygroundI18n: Record<Lang, IntersectionPlaygroundI18n> = {
  zh: {
    label1: '求交',
    label2: '算法',
    label3: '类型',
    label4: '直线与直线',
    label5: '线段与线段',
    label6: '直线与圆',
    label7: '圆与圆',
    label8: '几何输入',
    label9: '偏移',
    label10: '夹角',
    label11: '半径',
    label12: '场景',
    label13: '自定义',
    label14: '相交直线',
    label15: '显示段外的直线交点',
    label16: '不相交线段',
    label17: '平行直线',
    label18: '直线与圆相切',
    label19: '两圆相离',
  },
  en: {
    label1: 'Intersections',
    label2: 'Algorithm',
    label3: 'Type',
    label4: 'Line / line',
    label5: 'Segment / segment',
    label6: 'Line / circle',
    label7: 'Circle / circle',
    label8: 'Geometry input',
    label9: 'Offset',
    label10: 'Angle',
    label11: 'Radius',
    label12: 'Scenario',
    label13: 'Custom',
    label14: 'Crossing lines',
    label15: 'Line intersection beyond strokes',
    label16: 'Disjoint segments',
    label17: 'Parallel lines',
    label18: 'Line tangent to circle',
    label19: 'Disjoint circles',
  },
};

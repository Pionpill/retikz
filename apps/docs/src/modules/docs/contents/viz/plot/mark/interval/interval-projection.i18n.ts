import type { Lang } from '@/i18n';

/** 区间投影几何示意的阶段与图例 */
export const intervalProjectionI18n: Record<
  Lang,
  {
    stages: Array<string>;
    cartesian: string;
    polar: string;
    notes: Array<string>;
  }
> = {
  zh: {
    stages: ['1. 确认局部法向', '2. 辅助边界围出区域', '3. 绘制与圆角'],
    cartesian: '笛卡尔：矩形区间',
    polar: '极坐标：环形扇区',
    notes: ['箭头垂直于所在轴的切线', '灰色点线为几何辅助线', '圆角修饰边界，区间不变'],
  },
  en: {
    stages: ['1. Local normals', '2. Bound the region', '3. Paint and round'],
    cartesian: 'Cartesian: rectangle',
    polar: 'Polar: annular sector',
    notes: ['Arrows are normal to each axis', 'Dotted lines are construction aids', 'Round corners; keep the interval'],
  },
};

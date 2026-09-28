import type { Lang } from '@/i18n';

/** Point family 示例坐标系控件的可选值 */
export type PointCoordinateSystem = 'cartesian2D' | 'polar2D';

/** Point family 坐标系控件配置 */
export type PointCoordinateControlOptions<TId extends string> = Readonly<{
  /** 当前示例独占的控件 id */
  id: TId;
  /** 控件标签 */
  label: string;
  /** 笛卡尔坐标系标签 */
  cartesianLabel: string;
  /** 极坐标系标签 */
  polarLabel: string;
}>;

/** 创建 Point family 示例共用的坐标系选择控件 */
export const createPointCoordinateControl = <const TId extends string>(
  options: PointCoordinateControlOptions<TId>,
) => ({
  kind: 'select' as const,
  id: options.id,
  label: options.label,
  defaultValue: 'cartesian2D' as const,
  options: [
    { value: 'cartesian2D' as const, label: options.cartesianLabel },
    { value: 'polar2D' as const, label: options.polarLabel },
  ],
});

/** 创建紧跟数据表的 Point 坐标系控件分组 */
export const createPointCoordinateSection = <const TId extends string>(id: TId, lang: Lang = 'zh') => ({
  label: lang === 'zh' ? '坐标' : 'Coordinate',
  controls: [
    createPointCoordinateControl({
      id,
      label: lang === 'zh' ? '坐标系' : 'Coordinate system',
      cartesianLabel: lang === 'zh' ? '笛卡尔' : 'Cartesian',
      polarLabel: lang === 'zh' ? '极坐标' : 'Polar',
    }),
  ],
});

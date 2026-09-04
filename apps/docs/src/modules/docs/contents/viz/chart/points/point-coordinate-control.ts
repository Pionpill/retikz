/** Point family 示例坐标系控件的可选值 */
export type PointCoordinateSystem = 'cartesian2D' | 'polar2D';

/** Point family 示例的画布尺寸 */
export type PointPreviewLayout = Readonly<{
  /** 画布宽度 */
  width: number;
  /** 画布高度 */
  height: number;
}>;

/** Point family 示例画布的场景约束 */
export type PointPreviewLayoutOptions = Readonly<{
  /** 是否包含需要宽画布的分面 */
  hasFacet?: boolean;
}>;

const CARTESIAN_POINT_PREVIEW_LAYOUT = { width: 800, height: 500 } as const;
const POLAR_POINT_PREVIEW_LAYOUT = { width: 400, height: 500 } as const;
const FACET_POLAR_POINT_PREVIEW_LAYOUT = { width: 800, height: 400 } as const;

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

/** 按坐标系和分面状态解析 Point family 示例画布尺寸 */
export const resolvePointPreviewLayout = (
  coordinateSystem: PointCoordinateSystem,
  options: PointPreviewLayoutOptions = {},
): PointPreviewLayout => {
  if (coordinateSystem !== 'polar2D') {
    return CARTESIAN_POINT_PREVIEW_LAYOUT;
  }

  return options.hasFacet === true ? FACET_POLAR_POINT_PREVIEW_LAYOUT : POLAR_POINT_PREVIEW_LAYOUT;
};

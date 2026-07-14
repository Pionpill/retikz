/**
 * 坐标系类型关键字（暴露给用户；成员值即 IR 判别串，裸字面量 `'cartesian2D'` 同样可用）
 * @description discriminated union 判别字段，成员里写 z.literal(PlotCoordinate.x)（不用 z.enum）；命名按空间几何 + 维度
 */
export const PlotCoordinate = {
  /** 2D 笛卡尔空间（x 水平 / y 垂直） */
  Cartesian2D: 'cartesian2D',
  /** 2D 极坐标空间（angle 角向 / radius 径向；默认 x→angle、y→radius） */
  Polar2D: 'polar2D',
  /** 1D 笛卡尔直线（单维落一条轴线，另一屏幕维塌缩到固定基线；rug / timeline） */
  Cartesian1D: 'cartesian1D',
  /** 1D 极坐标圆周（单角向维落固定半径圆周；周期 / 循环数据） */
  Polar1D: 'polar1D',
  /** 2D 三元坐标（三个位置通道 x/y/z 归一化的重心坐标，投影到等边三角内；成分 / 配比 / 得票） */
  Ternary2D: 'ternary2D',
} as const;

/**
 * cartesian1D 轴向关键字（暴露给用户；裸字面量 `'horizontal'` 同样可用）
 * @description 决定一维直线沿哪个屏幕轴铺：horizontal 沿 x（基线在底）、vertical 沿 y（基线在左）；省略默认 horizontal（lowering 给）
 */
export const Cartesian1DOrientation = {
  /** 水平：数据沿 x 轴线，塌缩维基线在底边 */
  Horizontal: 'horizontal',
  /** 垂直：数据沿 y 轴线，塌缩维基线在左边 */
  Vertical: 'vertical',
} as const;

/** 内置坐标系 type 集：供自定义 coordinate operation 排除内置判别串 */
export const BUILTIN_COORDINATE_TYPES = new Set<string>(Object.values(PlotCoordinate));

import { Children, Fragment, type ReactNode, isValidElement } from 'react';
import {
  type ArrangementType,
  type Coordinate,
  type Encoding,
  type Guide,
  type Mark,
  PLOT_NAMESPACE,
  PlotArrangement,
  PlotComposite,
  PlotCoordinate,
  PlotGuide,
  PlotMark,
  PlotScale,
  type PlotSpec,
  PlotTransform,
  type Scale,
  type Transform,
} from '@retikz/plot';
import { Axis, type AxisProps } from './guides';
import {
  AreaMark,
  type AreaMarkProps,
  BarMark,
  type BarMarkProps,
  LineMark,
  type LineMarkProps,
  PointMark,
  type PointMarkProps,
  SectorMark,
  type SectorMarkProps,
} from './marks';

/** 自动建的 scale 名（用户不可见；需要显式 scale 配置时后续再加 <Scale>） */
const AUTO_X = '__x';
const AUTO_Y = '__y';
const AUTO_ANGLE = '__angle';
const AUTO_RADIUS = '__radius';
const AUTO_COLOR = '__color';

/** <Plot scaleX> 可选的连续 x scale 类型（柱状自动 band，故此处不含 band） */
export type DslScaleX = 'linear' | 'time' | 'point';

/**
 * <Plot coordinate> 入口形态：字符串简写 `"polar2D"` 或对象配置；缺省 cartesian2D
 * @description 简写 / 判别串与 IR 一致（`polar2D` / `cartesian2D`，含维度，为将来 1D / 3D 等留命名空间）；
 *   对象形态对应 polar2D 的角向区间 + 环图内半径几何（startAngle / endAngle 度、innerRadius 0..1 外半径占比）
 */
export type CoordinateInput =
  | 'polar2D'
  | {
      /** 坐标系判别串（与 IR 一致；目前仅 polar2D 可显式指定，cartesian2D 为缺省态不必写） */
      type: 'polar2D';
      /** 环图内半径（外半径占比 0..1）；0 = 实心饼 */
      innerRadius?: number;
      /** 角向起始角（度） */
      startAngle?: number;
      /** 角向终止角（度） */
      endAngle?: number;
    };

/** buildPlotSpec 选项：bare 开关 + 连续 x scale 类型 + 坐标系选择 */
export type BuildPlotSpecOptions = {
  /** 总开关：不出 guide（plot area = 整图），忽略 <Axis> */
  bare?: boolean;
  /** 连续 x scale 类型（缺省 linear；含 <BarMark> 时强制 band，忽略此项；polar 下忽略） */
  scaleX?: DslScaleX;
  /** 坐标系选择（缺省 cartesian2D）；"polar2D" 或 polar2D 对象配置 */
  coordinate?: CoordinateInput;
};

/** 无任何 <Axis> 子组件时填充的默认 guide：x 轴 + y 轴（y 带网格，横线读数值、不过密） */
const DEFAULT_GUIDES: ReadonlyArray<Guide> = [
  { type: PlotGuide.Axis, dimension: 'x' },
  { type: PlotGuide.Axis, dimension: 'y', grid: true },
];

/** 收集过程的可变累加器 */
type Collected = {
  marks: Array<Mark>;
  guides: Array<Guide>;
  transforms: Array<Transform>;
  /** 是否有 mark 用了颜色（→ 需自动 ordinal 色 scale） */
  colored: boolean;
  /** 是否有 <BarMark>（→ 角向轴强制 band scale） */
  hasBar: boolean;
  /** 是否有 <SectorMark>（→ 角向 linear scale） */
  hasSector: boolean;
  /** 是否有闭合 <LineMark>（雷达 → 角向 point scale） */
  hasClosedLine: boolean;
};

/** 颜色字段缺省取 series（分系列即按系列上色）；都无则不着色 */
const colorChannel = (color: string | undefined, series: string | undefined): { color: { field: string; scale: string } } | undefined => {
  const field = color ?? series;
  return field ? { color: { field, scale: AUTO_COLOR } } : undefined;
};

/** 把 x/y 字段装成位置 encoding（x/y 是唯一位置通道；polar 下坐标系把 x→angle、y→radius 重解释） */
const positionEncoding = (x: string, y: string): Pick<Encoding, 'x' | 'y'> => ({
  x: { field: x },
  y: { field: y },
});

/** 递归收集 mark / guide / transform：认 mark/guide 组件，穿透 Fragment，忽略其它节点 */
const collectInto = (children: ReactNode, into: Collected): void => {
  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) {
      collectInto((child.props as { children?: ReactNode }).children, into);
      return;
    }
    if (child.type === LineMark) {
      const { x, y, order, series, color, closed, id } = child.props as LineMarkProps;
      const colorEnc = colorChannel(color, series);
      into.marks.push({
        type: PlotMark.Line,
        ...(id !== undefined ? { id } : {}),
        ...(order !== undefined ? { order } : {}),
        ...(series !== undefined ? { series } : {}),
        ...(closed ? { closed: true } : {}),
        encoding: { ...positionEncoding(x, y), ...colorEnc },
      });
      if (colorEnc) into.colored = true;
      if (closed) into.hasClosedLine = true;
    } else if (child.type === PointMark) {
      const { x, y, color, id } = child.props as PointMarkProps;
      const colorEnc = colorChannel(color, undefined);
      into.marks.push({
        type: PlotMark.Point,
        ...(id !== undefined ? { id } : {}),
        encoding: { ...positionEncoding(x, y), ...colorEnc },
      });
      if (colorEnc) into.colored = true;
    } else if (child.type === BarMark) {
      const { x, y, color, series, stack, id } = child.props as BarMarkProps;
      const colorEnc = colorChannel(color, series);
      // series + stack → 堆叠（装配 stack transform，x/y/groupBy 与 mark 对齐）；series 无 stack → dodge
      let arrangement: ArrangementType | undefined;
      if (series !== undefined && stack) {
        arrangement = PlotArrangement.Stack;
        into.transforms.push({ kind: PlotTransform.Stack, x, y, groupBy: series });
      } else if (series !== undefined) {
        arrangement = PlotArrangement.Dodge;
      }
      into.marks.push({
        type: PlotMark.Interval,
        ...(id !== undefined ? { id } : {}),
        ...(series !== undefined ? { series } : {}),
        ...(arrangement !== undefined ? { arrangement } : {}),
        encoding: { x: { field: x }, y: { field: y }, ...colorEnc },
      });
      into.hasBar = true;
      if (colorEnc) into.colored = true;
    } else if (child.type === SectorMark) {
      const { angle, color, series, id } = child.props as SectorMarkProps;
      // 内建自动累积：装单链 stack transform（无分组 x，按 series 排序或数据序）；sector mark 读 y0/y1 为角界
      into.transforms.push({
        kind: PlotTransform.Stack,
        y: angle,
        ...(series !== undefined ? { groupBy: series } : {}),
      });
      // 颜色缺省按 angle 值字段本身分类上色（饼图每片一色）；lowering 的角向域读累积界 y0/y1，不经 encoding，故 encoding 仅承载 color
      const colorEnc = colorChannel(color, series) ?? colorChannel(angle, undefined);
      into.marks.push({
        type: PlotMark.Sector,
        ...(id !== undefined ? { id } : {}),
        encoding: { ...colorEnc },
      });
      into.hasSector = true;
      if (colorEnc) into.colored = true;
    } else if (child.type === AreaMark) {
      const { x, y, order, series, baseline, closed, color, id } = child.props as AreaMarkProps;
      const colorEnc = colorChannel(color, series);
      into.marks.push({
        type: PlotMark.Area,
        ...(id !== undefined ? { id } : {}),
        ...(order !== undefined ? { order } : {}),
        ...(series !== undefined ? { series } : {}),
        ...(baseline !== undefined ? { baseline } : {}),
        ...(closed ? { closed: true } : {}),
        encoding: { ...positionEncoding(x, y), ...colorEnc },
      });
      if (colorEnc) into.colored = true;
      if (closed) into.hasClosedLine = true;
    } else if (child.type === Axis) {
      const { dimension, tickCount, tickLabels, grid, id } = child.props as AxisProps;
      into.guides.push({
        type: PlotGuide.Axis,
        dimension,
        ...(id !== undefined ? { id } : {}),
        ...(tickCount !== undefined ? { tickCount } : {}),
        ...(tickLabels !== undefined ? { tickLabels } : {}),
        ...(grid !== undefined ? { grid } : {}),
      });
    }
  });
};

/** cartesian x scale 类型：含 <BarMark> → band；否则按 scaleX（缺省 linear） */
const buildCartesianXScale = (hasBar: boolean, scaleX: DslScaleX | undefined): Scale => {
  if (hasBar) return { type: PlotScale.Band, name: AUTO_X };
  if (scaleX === 'time') return { type: PlotScale.Time, name: AUTO_X };
  if (scaleX === 'point') return { type: PlotScale.Point, name: AUTO_X };
  return { type: PlotScale.Linear, name: AUTO_X };
};

/**
 * polar 角向 scale 类型推断：sector → linear（连续累积角界）；bar → band（径向柱分类）；
 *   闭合 line（雷达）→ point（类别落等距点）；否则 linear（极坐标折线）
 */
const buildAngleScale = (collected: Collected): Scale => {
  if (collected.hasSector) return { type: PlotScale.Linear, name: AUTO_ANGLE };
  if (collected.hasBar) return { type: PlotScale.Band, name: AUTO_ANGLE };
  if (collected.hasClosedLine) return { type: PlotScale.Point, name: AUTO_ANGLE };
  return { type: PlotScale.Linear, name: AUTO_ANGLE };
};

/** polar coordinate IR 的角向区间 / 内半径默认值（与 Polar2DSchema 的 .default() 一致，buildPlotSpec 即填满，等价手写无需再补） */
const POLAR_DEFAULT_START_ANGLE = 0;
const POLAR_DEFAULT_END_ANGLE = 360;
const POLAR_DEFAULT_INNER_RADIUS = 0;

/** 归一化 coordinate 选项为 polar 配置（undefined = cartesian），缺省字段填 schema 默认值 */
type PolarConfig = { innerRadius: number; startAngle: number; endAngle: number };
const toPolarConfig = (coordinate: CoordinateInput | undefined): PolarConfig | undefined => {
  if (coordinate === undefined) return undefined;
  if (coordinate === 'polar2D') {
    return { innerRadius: POLAR_DEFAULT_INNER_RADIUS, startAngle: POLAR_DEFAULT_START_ANGLE, endAngle: POLAR_DEFAULT_END_ANGLE };
  }
  return {
    innerRadius: coordinate.innerRadius ?? POLAR_DEFAULT_INNER_RADIUS,
    startAngle: coordinate.startAngle ?? POLAR_DEFAULT_START_ANGLE,
    endAngle: coordinate.endAngle ?? POLAR_DEFAULT_END_ANGLE,
  };
};

/**
 * 把 mark / guide 子组件装配成规范化 PlotSpec
 * @description 纯函数：从 children 收集 mark + guide + transform；按 coordinate（cartesian / polar）推断 scale 类型、
 *   装配 stack transform、自动建坐标系绑定（用户不写）。cartesian：x band/linear/time/point、y linear；
 *   polar：角向 sector→linear / bar→band / 闭合 line→point / 否则 linear，径向 linear。
 *   guide 规则：bare → 无；无 <Axis> → cartesian 默认全套（polar 默认无）；写了 <Axis> → 显式所得。
 *   产出须等价于手写 PlotSpec（仿 core Sugar = Kernel 等价性）。data 不进 IR，仅存 reference
 */
export const buildPlotSpec = (children: ReactNode, dataRef: string, options: BuildPlotSpecOptions = {}): PlotSpec => {
  const collected: Collected = { marks: [], guides: [], transforms: [], colored: false, hasBar: false, hasSector: false, hasClosedLine: false };
  collectInto(children, collected);

  const polar = toPolarConfig(options.coordinate);

  let coordinate: Coordinate;
  let scales: Array<Scale>;
  if (polar) {
    coordinate = {
      type: PlotCoordinate.Polar2D,
      angle: AUTO_ANGLE,
      radius: AUTO_RADIUS,
      startAngle: polar.startAngle,
      endAngle: polar.endAngle,
      innerRadius: polar.innerRadius,
    };
    scales = [buildAngleScale(collected), { type: PlotScale.Linear, name: AUTO_RADIUS }];
  } else {
    coordinate = { type: PlotCoordinate.Cartesian2D, x: AUTO_X, y: AUTO_Y };
    scales = [buildCartesianXScale(collected.hasBar, options.scaleX), { type: PlotScale.Linear, name: AUTO_Y }];
  }
  if (collected.colored) scales.push({ type: PlotScale.Ordinal, name: AUTO_COLOR });

  // polar 默认不画 guide（轴需用户显式声明）；cartesian 沿用默认全套
  const defaultGuides: ReadonlyArray<Guide> = polar ? [] : DEFAULT_GUIDES;
  const guides: Array<Guide> = options.bare ? [] : collected.guides.length > 0 ? collected.guides : [...defaultGuides];

  return {
    namespace: PLOT_NAMESPACE,
    type: PlotComposite.Plot,
    data: { reference: dataRef },
    ...(collected.transforms.length > 0 ? { transform: collected.transforms } : {}),
    scales,
    coordinate,
    marks: collected.marks,
    guides,
  };
};

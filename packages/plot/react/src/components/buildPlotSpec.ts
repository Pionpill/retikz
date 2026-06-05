import { Children, Fragment, type ReactNode, isValidElement } from 'react';
import {
  type ArrangementType,
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
import { BarMark, type BarMarkProps, LineMark, type LineMarkProps, PointMark, type PointMarkProps } from './marks';

/** 自动建的 scale 名（用户不可见；需要显式 scale 配置时后续再加 <Scale>） */
const AUTO_X = '__x';
const AUTO_Y = '__y';
const AUTO_COLOR = '__color';

/** <Plot scaleX> 可选的连续 x scale 类型（柱状自动 band，故此处不含 band） */
export type DslScaleX = 'linear' | 'time' | 'point';

/** buildPlotSpec 选项：bare 开关 + 连续 x scale 类型 */
export type BuildPlotSpecOptions = {
  /** 总开关：不出 guide（plot area = 整图），忽略 <Axis> */
  bare?: boolean;
  /** 连续 x scale 类型（缺省 linear；含 <BarMark> 时强制 band，忽略此项） */
  scaleX?: DslScaleX;
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
  /** 是否有 <BarMark>（→ x 强制 band scale） */
  hasBar: boolean;
};

/** 颜色字段缺省取 series（分系列即按系列上色）；都无则不着色 */
const colorChannel = (color: string | undefined, series: string | undefined): { color: { field: string; scale: string } } | undefined => {
  const field = color ?? series;
  return field ? { color: { field, scale: AUTO_COLOR } } : undefined;
};

/** 递归收集 mark / guide / transform：认 <LineMark>/<PointMark>/<BarMark>/<Axis>，穿透 Fragment，忽略其它节点 */
const collectInto = (children: ReactNode, into: Collected): void => {
  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) {
      collectInto((child.props as { children?: ReactNode }).children, into);
      return;
    }
    if (child.type === LineMark) {
      const { x, y, order, series, color, id } = child.props as LineMarkProps;
      const colorEnc = colorChannel(color, series);
      into.marks.push({
        type: PlotMark.Line,
        ...(id !== undefined ? { id } : {}),
        ...(order !== undefined ? { order } : {}),
        ...(series !== undefined ? { series } : {}),
        encoding: { x: { field: x }, y: { field: y }, ...colorEnc },
      });
      if (colorEnc) into.colored = true;
    } else if (child.type === PointMark) {
      const { x, y, color, id } = child.props as PointMarkProps;
      const colorEnc = colorChannel(color, undefined);
      into.marks.push({
        type: PlotMark.Point,
        ...(id !== undefined ? { id } : {}),
        encoding: { x: { field: x }, y: { field: y }, ...colorEnc },
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

/** x scale 类型：含 <BarMark> → band；否则按 scaleX（缺省 linear） */
const buildXScale = (hasBar: boolean, scaleX: DslScaleX | undefined): Scale => {
  if (hasBar) return { type: PlotScale.Band, name: AUTO_X };
  if (scaleX === 'time') return { type: PlotScale.Time, name: AUTO_X };
  if (scaleX === 'point') return { type: PlotScale.Point, name: AUTO_X };
  return { type: PlotScale.Linear, name: AUTO_X };
};

/**
 * 把 mark / guide 子组件装配成规范化 PlotSpec
 * @description 纯函数：从 children 收集 mark + guide + transform；按 mark 推断 scale 类型（<BarMark>→band x、color→ordinal）、
 *   装配 stack transform，自动建 cartesian2D 绑定（用户不写）。guide 规则：bare → 无；无 <Axis> → 默认全套；写了 <Axis> → 显式所得。
 *   产出须等价于手写 PlotSpec（仿 core Sugar = Kernel 等价性）。data 不进 IR，仅存 reference
 */
export const buildPlotSpec = (children: ReactNode, dataRef: string, options: BuildPlotSpecOptions = {}): PlotSpec => {
  const collected: Collected = { marks: [], guides: [], transforms: [], colored: false, hasBar: false };
  collectInto(children, collected);
  const guides: Array<Guide> = options.bare ? [] : collected.guides.length > 0 ? collected.guides : [...DEFAULT_GUIDES];
  const scales: Array<Scale> = [buildXScale(collected.hasBar, options.scaleX), { type: PlotScale.Linear, name: AUTO_Y }];
  if (collected.colored) scales.push({ type: PlotScale.Ordinal, name: AUTO_COLOR });
  return {
    namespace: PLOT_NAMESPACE,
    type: PlotComposite.Plot,
    data: { reference: dataRef },
    ...(collected.transforms.length > 0 ? { transform: collected.transforms } : {}),
    scales,
    coordinate: { type: PlotCoordinate.Cartesian2D, x: AUTO_X, y: AUTO_Y },
    marks: collected.marks,
    guides,
  };
};

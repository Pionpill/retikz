import { Children, Fragment, type ReactNode, isValidElement } from 'react';
import {
  type Guide,
  type Mark,
  PLOT_NAMESPACE,
  PlotComposite,
  PlotCoordinate,
  PlotGuide,
  PlotMark,
  PlotScale,
  type PlotSpec,
} from '@retikz/plot';
import { Axis, type AxisProps } from './guides';
import { LineMark, type LineMarkProps, PointMark, type PointMarkProps } from './marks';

/** 自动建的位置 scale 名（用户不可见；需要显式 scale 配置时 alpha.3 再加 <Scale>） */
const AUTO_X = '__x';
const AUTO_Y = '__y';

/** 无任何 <Axis> 子组件时填充的默认 guide：x 轴 + y 轴（y 带网格，横线读数值、不过密） */
const DEFAULT_GUIDES: ReadonlyArray<Guide> = [
  { type: PlotGuide.Axis, dimension: 'x' },
  { type: PlotGuide.Axis, dimension: 'y', grid: true },
];

/** 递归收集 mark / guide 配置：认 <LineMark>/<PointMark>/<Axis>，穿透 Fragment，忽略其它节点 */
const collectInto = (children: ReactNode, marks: Array<Mark>, guides: Array<Guide>): void => {
  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) {
      collectInto((child.props as { children?: ReactNode }).children, marks, guides);
      return;
    }
    if (child.type === LineMark) {
      const { x, y, order, id } = child.props as LineMarkProps;
      marks.push({
        type: PlotMark.Line,
        ...(id !== undefined ? { id } : {}),
        ...(order !== undefined ? { order } : {}),
        encoding: { x: { field: x }, y: { field: y } },
      });
    } else if (child.type === PointMark) {
      const { x, y, id } = child.props as PointMarkProps;
      marks.push({
        type: PlotMark.Point,
        ...(id !== undefined ? { id } : {}),
        encoding: { x: { field: x }, y: { field: y } },
      });
    } else if (child.type === Axis) {
      const { dimension, tickCount, tickLabels, grid, id } = child.props as AxisProps;
      guides.push({
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

/**
 * 把 mark / guide 子组件装配成规范化 PlotSpec
 * @description 纯函数：从 children 收集 mark + guide，自动建 linear scale(__x/__y) + cartesian2D 绑定（用户不写）；
 *   guide 规则：bare → 无 guide；无任何 <Axis> → 默认全套（x 轴 + y 轴带网格）；写了 <Axis> → 完全显式所得。
 *   产出须等价于手写 PlotSpec（仿 core Sugar = Kernel 等价性）。data 不进 IR，仅存 ref
 */
export const buildPlotSpec = (children: ReactNode, dataRef: string, options: { bare?: boolean } = {}): PlotSpec => {
  const marks: Array<Mark> = [];
  const explicitGuides: Array<Guide> = [];
  collectInto(children, marks, explicitGuides);
  const guides: Array<Guide> = options.bare ? [] : explicitGuides.length > 0 ? explicitGuides : [...DEFAULT_GUIDES];
  return {
    namespace: PLOT_NAMESPACE,
    type: PlotComposite.Plot,
    data: { ref: dataRef },
    scales: [
      { type: PlotScale.Linear, name: AUTO_X },
      { type: PlotScale.Linear, name: AUTO_Y },
    ],
    coordinate: { type: PlotCoordinate.Cartesian2D, x: AUTO_X, y: AUTO_Y },
    marks,
    guides,
  };
};

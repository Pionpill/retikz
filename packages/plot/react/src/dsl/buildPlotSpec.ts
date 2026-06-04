import { Children, Fragment, type ReactNode, isValidElement } from 'react';
import { type Mark, PLOT_NAMESPACE, PlotComposite, PlotCoordinate, PlotMark, PlotScale, type PlotSpec } from '@retikz/plot';
import { LineMark, type LineMarkProps, PointMark, type PointMarkProps } from './marks';

/** 自动建的位置 scale 名（用户不可见；需要显式 scale 配置时 alpha.3 再加 <Scale>） */
const AUTO_X = '__x';
const AUTO_Y = '__y';

/** 递归收集 mark 配置：只认 <LineMark>/<PointMark>，穿透 Fragment，忽略其它节点 */
const collectInto = (children: ReactNode, out: Array<Mark>): void => {
  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) {
      collectInto((child.props as { children?: ReactNode }).children, out);
      return;
    }
    if (child.type === LineMark) {
      const { x, y, order, id } = child.props as LineMarkProps;
      out.push({
        type: PlotMark.Line,
        ...(id !== undefined ? { id } : {}),
        ...(order !== undefined ? { order } : {}),
        encoding: { x: { field: x }, y: { field: y } },
      });
    } else if (child.type === PointMark) {
      const { x, y, id } = child.props as PointMarkProps;
      out.push({
        type: PlotMark.Point,
        ...(id !== undefined ? { id } : {}),
        encoding: { x: { field: x }, y: { field: y } },
      });
    }
  });
};

/**
 * 把 mark 子组件装配成规范化 PlotSpec
 * @description 纯函数：从 children 收集 mark，自动建 linear scale(__x/__y) + cartesian2D 绑定（用户不写）；
 *   产出须等价于手写 PlotSpec（仿 core Sugar = Kernel 等价性）。data 不进 IR，仅存 ref
 */
export const buildPlotSpec = (children: ReactNode, dataRef: string): PlotSpec => {
  const marks: Array<Mark> = [];
  collectInto(children, marks);
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
  };
};

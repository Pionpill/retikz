import type { ReactNode } from 'react';

import { createElement, Fragment, isValidElement } from 'react';

import type { ScatterChartMark, ScatterMarkProps } from './marks';

import { ScatterMark } from './marks';

/** Point Chart children 按 owner 拆分后的输入 */
export type PointChartChildrenSplit = Readonly<{
  marks: Array<ScatterChartMark>;
  plotChildren: ReactNode;
}>;

/** 从 Point Chart 直接 children 中提取 Chart-owned 声明并保留剩余 slot 路径 */
export const splitPointChartChildren = (children: ReactNode): PointChartChildrenSplit => {
  const marks: Array<ScatterChartMark> = [];
  const visit = (value: ReactNode): ReactNode => {
    if (Array.isArray(value)) return value.map(visit);
    if (isValidElement(value) && value.type === Fragment) {
      return createElement(Fragment, null, visit(value.props.children as ReactNode));
    }
    if (isValidElement(value) && value.type === ScatterMark) {
      const props = value.props as ScatterMarkProps;
      marks.push({ ...props, kind: 'scatter' });
      return null;
    }
    return value;
  };
  const plotChildren = visit(children);
  return { marks, plotChildren };
};

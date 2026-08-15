import type { IRChild, IRJsonObject, IRNode, IRPathBase, IRScope } from '@retikz/core';

import type { IRPlotAxisGuide, IRPlotGuide } from '../../../schemas';

import { isAxisGuide } from '../../../resolve/composition';
import { PlotGuide } from '../../../schemas';

/** 判断 guide 是否为 legend */
export const isLegendGuide = (guide: IRPlotGuide): guide is Extract<IRPlotGuide, { type: typeof PlotGuide.Legend }> =>
  guide.type === PlotGuide.Legend;

/** 关闭 axis guide 的 grid 输出，同时保留其它 guide 字段。 */
export const withoutAxisGrid = (guides: ReadonlyArray<IRPlotGuide>): Array<IRPlotGuide> =>
  guides.map(guide => (isAxisGuide(guide) && guide.grid !== undefined ? { ...guide, grid: false } : guide));

/** 为指定 scope 启用 axis grid。 */
export const withEnabledAxisGrid = (guide: IRPlotAxisGuide, coordinateView: string | undefined): IRPlotAxisGuide => ({
  ...guide,
  ...(coordinateView !== undefined ? { coordinateView } : {}),
  grid: guide.grid === undefined || guide.grid === false ? true : guide.grid,
});

const mergeContextMeta = (meta: IRJsonObject | undefined, context: IRJsonObject): IRJsonObject => ({
  ...(meta ?? {}),
  ...context,
});

const isIRScope = (child: IRChild): child is IRScope => child.type === 'scope' && 'children' in child;
const isIRNode = (child: IRChild): child is IRNode => child.type === 'node' && 'position' in child;
const isIRPath = (child: IRChild): child is IRPathBase => child.type === 'path' && 'children' in child;

/** 把 coordinate scope context 递归写入 lowering 产物 metadata。 */
export const withScopeContext = (child: IRChild, context: IRJsonObject): IRChild => {
  if (Object.keys(context).length === 0) return child;
  if (isIRScope(child)) {
    return {
      ...child,
      meta: mergeContextMeta(child.meta, context),
      children: child.children.map(item => withScopeContext(item, context)),
    };
  }
  if (isIRNode(child)) return { ...child, meta: mergeContextMeta(child.meta, context) } satisfies IRNode;
  if (isIRPath(child)) return { ...child, meta: mergeContextMeta(child.meta, context) } satisfies IRPathBase;
  return child;
};

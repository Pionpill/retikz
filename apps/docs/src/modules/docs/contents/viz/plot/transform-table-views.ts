import type { IRDataTransform } from '@retikz/data';

import { resolvePlotTransformRegistry } from '@retikz/plot';

import type { PreviewTableView, TransformTableRows, TransformTableViewOptions } from '@/modules/docs/preview';

import { createTransformResultView, createTransformTableViews } from '@/modules/docs/preview';

/** Plot transform table view 的可选运行时依赖 */
export type PlotTransformTableViewOptions = Omit<TransformTableViewOptions, 'registry'> & {
  /** 在 Plot 内置 definitions 之后注册的自定义 transform definitions */
  transformDefinitions?: Parameters<typeof resolvePlotTransformRegistry>[0];
};

/** 创建使用完整 Plot transform registry 的单一结果视图 */
export const createPlotTransformResultView = <TValues extends object>(
  id: string,
  label: string,
  rows: TransformTableRows<TValues>,
  operationsOf: (values: TValues) => IRDataTransform | ReadonlyArray<IRDataTransform>,
  options: PlotTransformTableViewOptions = {},
): PreviewTableView =>
  createTransformResultView(id, label, rows, operationsOf, {
    registry: resolvePlotTransformRegistry(options.transformDefinitions),
    context: options.context,
  });

/** 创建使用完整 Plot transform registry 的原始行与结果视图 */
export const createPlotTransformTableViews = <TValues extends object>(
  labels: { source: string; result: string },
  rows: TransformTableRows<TValues>,
  operationsOf: (values: TValues) => IRDataTransform | ReadonlyArray<IRDataTransform>,
  options: PlotTransformTableViewOptions = {},
): ReadonlyArray<PreviewTableView> =>
  createTransformTableViews(labels, rows, operationsOf, {
    registry: resolvePlotTransformRegistry(options.transformDefinitions),
    context: options.context,
  });

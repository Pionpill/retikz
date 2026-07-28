import type { AnyTransformDefinition, ExternalRow, IRDataTransform, TransformContext } from '@retikz/data';

import { applyTransforms } from '@retikz/data';

import type { PreviewTableView } from '@/modules/docs/preview';

/** 单一 transform 输出视图的运行时依赖 */
export type TransformTableViewOptions = {
  /** 自定义 transform registry */
  registry?: ReadonlyMap<string, AnyTransformDefinition>;
  /** 自定义统计 Definition 等运行时上下文 */
  context?: TransformContext;
};

/** 创建一个按实时 controls 执行 Data transform 的 table view */
export const createTransformResultView = <TValues extends object>(
  id: string,
  label: string,
  rows: ReadonlyArray<ExternalRow>,
  operationsOf: (values: TValues) => IRDataTransform | ReadonlyArray<IRDataTransform>,
  options: TransformTableViewOptions = {},
): PreviewTableView => ({
  id,
  label,
  rows: values => {
    const operations = operationsOf(values as TValues);
    const pipeline = Array.isArray(operations) ? [...operations] : [operations as IRDataTransform];
    return applyTransforms([...rows], pipeline, options.registry, options.context);
  },
});

/** 创建原始行与单一 transform 输出组成的 table views */
export const createTransformTableViews = <TValues extends object>(
  labels: { source: string; result: string },
  rows: ReadonlyArray<ExternalRow>,
  operationsOf: (values: TValues) => IRDataTransform | ReadonlyArray<IRDataTransform>,
  options: TransformTableViewOptions = {},
): ReadonlyArray<PreviewTableView> => [
  { id: 'source', label: labels.source, rows },
  createTransformResultView('result', labels.result, rows, operationsOf, options),
];

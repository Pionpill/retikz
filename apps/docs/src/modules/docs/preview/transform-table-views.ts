import type { AnyTransformDefinition, ExternalRow, IRDataTransform, TransformContext } from '@retikz/data';

import { applyTransforms } from '@retikz/data';

import type { PreviewTableView } from '../components/component-preview/author';

/** 单一 transform 输出视图的运行时依赖 */
export type TransformTableViewOptions = {
  /** 自定义 transform registry */
  registry?: ReadonlyMap<string, AnyTransformDefinition>;
  /** 自定义统计 Definition 等运行时上下文 */
  context?: TransformContext;
};

/** transform table view 的静态或按实时控件派生的数据行 */
export type TransformTableRows<TValues extends object> =
  | ReadonlyArray<ExternalRow>
  | ((values: TValues) => ReadonlyArray<ExternalRow>);

/** 创建一个按实时 controls 执行 Data transform 的 table view */
export const createTransformResultView = <TValues extends object>(
  id: string,
  label: string,
  rows: TransformTableRows<TValues>,
  operationsOf: (values: TValues) => IRDataTransform | ReadonlyArray<IRDataTransform>,
  options: TransformTableViewOptions = {},
): PreviewTableView => ({
  id,
  label,
  rows: values => {
    const operations = operationsOf(values as TValues);
    const pipeline = Array.isArray(operations) ? [...operations] : [operations as IRDataTransform];
    const sourceRows = typeof rows === 'function' ? rows(values as TValues) : rows;
    return applyTransforms([...sourceRows], pipeline, options.registry, options.context);
  },
});

/** 创建原始行与单一 transform 输出组成的 table views */
export const createTransformTableViews = <TValues extends object>(
  labels: { source: string; result: string },
  rows: TransformTableRows<TValues>,
  operationsOf: (values: TValues) => IRDataTransform | ReadonlyArray<IRDataTransform>,
  options: TransformTableViewOptions = {},
): ReadonlyArray<PreviewTableView> => [
  { id: 'source', label: labels.source, rows: typeof rows === 'function' ? values => rows(values as TValues) : rows },
  createTransformResultView('result', labels.result, rows, operationsOf, options),
];

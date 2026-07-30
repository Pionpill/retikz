import type { IRPlotTransform, PlotLineageOptions, PlotLineageRun } from '@retikz/plot';

type ControlledPlotLineageOptions = Required<
  Pick<PlotLineageOptions, 'markIdentity' | 'markEncoding' | 'scaleMappings' | 'layoutContext'>
>;

type ControlledPlotTransformOptions = {
  /** 是否应用 root 收入排序 */
  rootSortEnabled: boolean;
  /** root 收入排序方向 */
  rootSortOrder: 'ascending' | 'descending';
  /** 是否应用 mark-local Top-N */
  markSelectEnabled: boolean;
  /** mark-local Top-N 保留行数 */
  markTopN: number;
};

/** controls 对应的 root 与 mark-local transform */
export type PlotLineageTransforms = {
  /** Plot 根级 transform */
  root: Array<IRPlotTransform>;
  /** 单个 mark 的局部 transform */
  mark: Array<IRPlotTransform>;
};

/** 单个 transform step 的紧凑摘要 */
export type PlotLineageTransformStepSummary = {
  /** transform 所属范围 */
  scope: 'root' | `mark[${number}]`;
  /** transform operation kind */
  operation: string;
  /** 输入行数 */
  inputRows: number;
  /** 输出行数 */
  outputRows: number;
};

/** 把 controls 的稳定字段映射到公开 Plot lineage 选项 */
export const buildPlotLineageOptions = (values: ControlledPlotLineageOptions): PlotLineageOptions => ({
  markIdentity: values.markIdentity,
  markEncoding: values.markEncoding,
  scaleMappings: values.scaleMappings,
  layoutContext: values.layoutContext,
});

/** 把 controls 映射为 Plot 根级排序与 mark-local Top-N */
export const buildPlotLineageTransforms = (values: ControlledPlotTransformOptions): PlotLineageTransforms => ({
  root: values.rootSortEnabled ? [{ kind: 'sort', field: 'revenue', order: values.rootSortOrder }] : [],
  mark: values.markSelectEnabled
    ? [{ kind: 'select', selector: { kind: 'top', by: 'revenue', n: values.markTopN } }]
    : [],
});

/** 从真实 Plot lineage 产物提取 root 与 mark-local transform step */
export const summarizePlotLineageTransformSteps = (lineage: PlotLineageRun): Array<PlotLineageTransformStepSummary> => {
  const summarizeEvents = (
    scope: PlotLineageTransformStepSummary['scope'],
    events: PlotLineageRun['data']['root']['events'],
  ): Array<PlotLineageTransformStepSummary> =>
    events.flatMap(event =>
      event.kind === 'transformStep'
        ? [
            {
              scope,
              operation: event.operationKind,
              inputRows: event.inputRowCount,
              outputRows: event.outputRowCount,
            },
          ]
        : [],
    );

  return [
    ...summarizeEvents('root', lineage.data.root.events),
    ...lineage.data.marks.flatMap(mark => summarizeEvents(`mark[${mark.markIndex}]`, mark.events)),
  ];
};

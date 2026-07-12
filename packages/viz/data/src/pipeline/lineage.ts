import type {
  DataLineageEvent,
  DataLineageOptions,
  DataLineageRecorder,
  DataLineageRun,
  DataSourceIdentity,
  DataSourceIdentityOptions,
  DataValueSampleOptions,
} from '../contract';
import type { ExternalRow } from '../shared';

import { DataSourceIdentityMode } from '../contract';
import { resolveFieldPath } from '../providers';
import { readSourceIndicesOf } from './provenance';

const DEFAULT_SOURCE_IDENTITY_LIMIT = 20;

/**
 * data lineage recorder 的归一化消费选项。
 * @description 已补齐公开开关默认值，并把需要记录 row 值的选项收敛为显式白名单形态。
 */
type ResolvedDataLineageOptions = {
  /** sourceIndex / sourceIndices 摘要策略；false 表示不记录来源索引。 */
  sourceIdentity: false | Required<DataSourceIdentityOptions>;
  /** 是否记录 transform step 摘要事件。 */
  transformSteps: boolean;
  /** 是否记录字段输入 / 输出流向事件。 */
  fieldFlow: boolean;
  /** 是否记录 reducer 操作摘要事件。 */
  reducerOperations: boolean;
  /** 是否记录 selector 操作摘要事件。 */
  selectorOperations: boolean;
  /** transform 前后 row 样本白名单；false 表示不记录行值。 */
  rowSamples: false | DataValueSampleOptions;
  /** reducer / selector 诊断详情白名单；false 表示不记录候选行值。 */
  calculationDetails: false | DataValueSampleOptions;
  /** 可选的流式事件消费回调。 */
  sink?: (event: DataLineageEvent) => void;
  /** 是否在返回的 lineage run 中保留事件数组。 */
  retainEvents: boolean;
};

/** 校验 sample 类开关，避免省略字段后记录整行。 */
const normalizeSampleOptions = (
  value: false | DataValueSampleOptions | undefined,
  label: string,
): false | DataValueSampleOptions => {
  if (value === undefined || value === false) return false;
  if (!Number.isInteger(value.maxRows) || value.maxRows < 1) {
    throw new Error(`data lineage: ${label}.maxRows must be a positive integer`);
  }
  if (!Array.isArray(value.fields) || value.fields.length === 0) {
    throw new Error(`data lineage: ${label}.fields must be a non-empty field whitelist`);
  }
  value.fields.forEach((field, index) => {
    if (typeof field !== 'string' || field.length === 0) {
      throw new Error(`data lineage: ${label}.fields[${index}] must be a non-empty string`);
    }
  });
  return { maxRows: value.maxRows, fields: [...value.fields] };
};

/** 解析 source identity 开关；默认 summary + 固定上限。 */
const normalizeSourceIdentityOptions = (
  value: DataLineageOptions['sourceIdentity'],
): false | Required<DataSourceIdentityOptions> => {
  if (value === false) return false;
  if (value === true || value === undefined) {
    return { mode: DataSourceIdentityMode.Summary, maxIndices: DEFAULT_SOURCE_IDENTITY_LIMIT };
  }
  const mode: unknown = value.mode ?? DataSourceIdentityMode.Summary;
  const maxIndices = value.maxIndices ?? DEFAULT_SOURCE_IDENTITY_LIMIT;
  if (mode !== DataSourceIdentityMode.Summary && mode !== DataSourceIdentityMode.Full) {
    throw new Error('data lineage: sourceIdentity.mode must be "summary" or "full"');
  }
  if (!Number.isInteger(maxIndices) || maxIndices < 1) {
    throw new Error('data lineage: sourceIdentity.maxIndices must be a positive integer');
  }
  return { mode, maxIndices };
};

/** 归一化 lineage 开关默认值。 */
const normalizeLineageOptions = (options: DataLineageOptions = {}): ResolvedDataLineageOptions => ({
  sourceIdentity: normalizeSourceIdentityOptions(options.sourceIdentity),
  transformSteps: options.transformSteps ?? true,
  fieldFlow: options.fieldFlow ?? false,
  reducerOperations: options.reducerOperations ?? false,
  selectorOperations: options.selectorOperations ?? false,
  rowSamples: normalizeSampleOptions(options.rowSamples, 'rowSamples'),
  calculationDetails: normalizeSampleOptions(options.calculationDetails, 'calculationDetails'),
  ...(options.sink !== undefined ? { sink: options.sink } : {}),
  retainEvents: options.sink === undefined || options.retainEvents === true,
});

/** 按字段白名单裁剪 row 样本。 */
const sampleRows = (rows: Array<ExternalRow>, options: DataValueSampleOptions): Array<ExternalRow> =>
  rows.slice(0, options.maxRows).map(row => {
    const out: ExternalRow = {};
    for (const field of options.fields) out[field] = resolveFieldPath(row, field);
    return out;
  });

/** 生成来源索引摘要。 */
const sourceIdentityOf = (
  rows: Array<ExternalRow>,
  options: false | Required<DataSourceIdentityOptions>,
): DataSourceIdentity | undefined => {
  if (options === false) return undefined;
  const indices = readSourceIndicesOf(rows);
  const full = options.mode === DataSourceIdentityMode.Full;
  const visible = full ? indices : indices.slice(0, options.maxIndices);
  return {
    mode: options.mode,
    count: indices.length,
    indices: visible,
    truncated: !full && visible.length < indices.length,
  };
};

/** 创建 data lineage recorder。 */
export const createDataLineageRecorder = (options: DataLineageOptions = {}): DataLineageRecorder & DataLineageRun => {
  const resolved = normalizeLineageOptions(options);
  const events: Array<DataLineageEvent> = [];

  const record = (event: DataLineageEvent): void => {
    if (resolved.retainEvents) events.push(event);
    resolved.sink?.(event);
  };

  return {
    events,
    recordSource: rows => {
      record({
        kind: 'source',
        rowCount: rows.length,
        ...(resolved.sourceIdentity !== false
          ? { sourceIdentity: sourceIdentityOf(rows, resolved.sourceIdentity) }
          : {}),
      });
    },
    recordTransformStep: input => {
      const operationKind = input.operation.kind;
      if (resolved.rowSamples !== false) {
        record({
          kind: 'rowSample',
          operationIndex: input.operationIndex,
          operationKind,
          phase: 'input',
          rows: sampleRows(input.inputRows, resolved.rowSamples),
        });
      }
      if (resolved.transformSteps) {
        record({
          kind: 'transformStep',
          operationIndex: input.operationIndex,
          operationKind,
          inputRowCount: input.inputRows.length,
          outputRowCount: input.outputRows.length,
          inputFields: [...input.inputFields],
          outputFields: [...input.outputFields],
          ...(resolved.sourceIdentity !== false
            ? {
                inputSourceIdentity: sourceIdentityOf(input.inputRows, resolved.sourceIdentity),
                outputSourceIdentity: sourceIdentityOf(input.outputRows, resolved.sourceIdentity),
              }
            : {}),
        });
      }
      if (resolved.fieldFlow) {
        record({
          kind: 'fieldFlow',
          operationIndex: input.operationIndex,
          operationKind,
          inputFields: [...input.inputFields],
          outputFields: [...input.outputFields],
        });
      }
      if (resolved.rowSamples !== false) {
        record({
          kind: 'rowSample',
          operationIndex: input.operationIndex,
          operationKind,
          phase: 'output',
          rows: sampleRows(input.outputRows, resolved.rowSamples),
        });
      }
    },
    recordReducerOperation: input => {
      if (!resolved.reducerOperations) return;
      record({
        kind: 'reducerOperation',
        operationKind: input.operation.kind,
        operation: input.operation,
        inputFields: [...input.inputFields],
        outputFields: [...input.outputFields],
        rowCount: input.rows.length,
        ...(resolved.sourceIdentity !== false
          ? { sourceIdentity: sourceIdentityOf(input.rows, resolved.sourceIdentity) }
          : {}),
        ...(resolved.calculationDetails !== false
          ? { detailRows: sampleRows(input.rows, resolved.calculationDetails) }
          : {}),
      });
    },
    recordSelectorOperation: input => {
      if (!resolved.selectorOperations) return;
      record({
        kind: 'selectorOperation',
        operationKind: input.operation.kind,
        operation: input.operation,
        inputFields: [...input.inputFields],
        rowCount: input.rows.length,
        ...(resolved.sourceIdentity !== false
          ? {
              sourceIdentity: sourceIdentityOf(input.rows, resolved.sourceIdentity),
              selectedSourceIdentity: sourceIdentityOf(input.selectedRows, resolved.sourceIdentity),
            }
          : {}),
        ...(resolved.calculationDetails !== false
          ? { detailRows: sampleRows(input.rows, resolved.calculationDetails) }
          : {}),
      });
    },
  };
};

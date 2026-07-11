import type { ExternalRow, IRDataReducerOperation, IRDataSelectorOperation, IRDataTransform } from '../schemas';

/** 数据来源索引摘要模式。 */
export type DataSourceIdentityMode = 'summary' | 'full';

/** 数据来源索引记录选项。 */
export type DataSourceIdentityOptions = {
  /** summary 只记录 count + 前 maxIndices 个索引；full 只允许显式开启。 */
  mode?: DataSourceIdentityMode;
  /** summary 模式下保留的 sourceIndices 前缀长度。 */
  maxIndices?: number;
};

/** 记录行值样本的安全白名单选项。 */
export type DataValueSampleOptions = {
  /** 最大记录行数，必须为正有限数。 */
  maxRows: number;
  /** 允许记录值的字段白名单，必须非空；不允许省略后记录整行。 */
  fields: Array<string>;
};

/** data lineage 运行时开关。 */
export type DataLineageOptions = {
  /** 记录 sourceIndex / sourceIndices；对象存在时默认 summary + maxIndices: 20。 */
  sourceIdentity?: boolean | DataSourceIdentityOptions;
  /** 记录 transform 顺序、kind、输入 / 输出行数与输入 / 输出字段。 */
  transformSteps?: boolean;
  /** 记录字段级读取 / 产出关系。 */
  fieldFlow?: boolean;
  /** 记录 reducer kind、目标字段和输入字段，不记录每行输入值。 */
  reducerOperations?: boolean;
  /** 记录 selector kind、排序 / 分组选项和被选行 sourceIdentity，不记录候选排名。 */
  selectorOperations?: boolean;
  /** 记录 transform 前后 row 样本，必须显式限制行数和字段。 */
  rowSamples?: false | DataValueSampleOptions;
  /** 记录 reducer 输入值或 selector 候选详情，必须显式限制行数和字段。 */
  calculationDetails?: false | DataValueSampleOptions;
  /** 事件流式消费回调。 */
  sink?: DataLineageSink;
  /** 使用 sink 时是否仍在返回值中保留 events；默认 false，未设置 sink 时默认 true。 */
  retainEvents?: boolean;
};

/** 数据来源索引摘要。 */
export type DataSourceIdentity = {
  /** 记录模式；summary 是默认安全摘要，full 只在显式开启时出现。 */
  mode: DataSourceIdentityMode;
  /** 来源索引总数。 */
  count: number;
  /** 记录的来源索引；summary 模式为 capped 前缀，full 模式为完整列表。 */
  indices: Array<number>;
  /** summary 模式下是否因 maxIndices 截断。 */
  truncated: boolean;
};

/** 原始数据来源事件。 */
export type DataLineageSourceEvent = {
  /** 事件类型。 */
  kind: 'source';
  /** 输入数据行数。 */
  rowCount: number;
  /** 输入来源索引摘要。 */
  sourceIdentity?: DataSourceIdentity;
};

/** transform step 摘要事件。 */
export type DataLineageTransformStepEvent = {
  /** 事件类型。 */
  kind: 'transformStep';
  /** transform 在声明数组中的下标。 */
  operationIndex: number;
  /** transform kind。 */
  operationKind: string;
  /** 输入行数。 */
  inputRowCount: number;
  /** 输出行数。 */
  outputRowCount: number;
  /** definition 声明的输入字段。 */
  inputFields: Array<string>;
  /** definition 声明的输出字段。 */
  outputFields: Array<string>;
  /** 输入来源索引摘要。 */
  inputSourceIdentity?: DataSourceIdentity;
  /** 输出来源索引摘要。 */
  outputSourceIdentity?: DataSourceIdentity;
};

/** transform 字段流事件。 */
export type DataLineageFieldFlowEvent = {
  /** 事件类型。 */
  kind: 'fieldFlow';
  /** transform 在声明数组中的下标。 */
  operationIndex: number;
  /** transform kind。 */
  operationKind: string;
  /** definition 声明的输入字段。 */
  inputFields: Array<string>;
  /** definition 声明的输出字段。 */
  outputFields: Array<string>;
};

/** reducer 操作摘要事件。 */
export type DataLineageReducerEvent = {
  /** 事件类型。 */
  kind: 'reducerOperation';
  /** reducer kind。 */
  operationKind: string;
  /** reducer operation 配置摘要；只包含 JSON-safe operation 字段，不包含行值。 */
  operation: IRDataReducerOperation;
  /** definition 声明的输入字段。 */
  inputFields: Array<string>;
  /** definition 声明的输出字段。 */
  outputFields: Array<string>;
  /** reducer 本次消费的行数。 */
  rowCount: number;
  /** reducer 输入行来源摘要。 */
  sourceIdentity?: DataSourceIdentity;
  /** 诊断详情样本；仅 calculationDetails 开启时存在。 */
  detailRows?: Array<ExternalRow>;
};

/** selector 操作摘要事件。 */
export type DataLineageSelectorEvent = {
  /** 事件类型。 */
  kind: 'selectorOperation';
  /** selector kind。 */
  operationKind: string;
  /** selector operation 配置摘要；只包含 JSON-safe operation 字段，不包含行值。 */
  operation: IRDataSelectorOperation;
  /** definition 声明的输入字段。 */
  inputFields: Array<string>;
  /** selector 本次消费的行数。 */
  rowCount: number;
  /** selector 输入行来源摘要。 */
  sourceIdentity?: DataSourceIdentity;
  /** 被选行来源摘要。 */
  selectedSourceIdentity?: DataSourceIdentity;
  /** 诊断详情样本；仅 calculationDetails 开启时存在。 */
  detailRows?: Array<ExternalRow>;
};

/** row sample 事件。 */
export type DataLineageSampleEvent = {
  /** 事件类型。 */
  kind: 'rowSample';
  /** transform 在声明数组中的下标。 */
  operationIndex: number;
  /** transform kind。 */
  operationKind: string;
  /** 样本来自 transform 输入还是输出。 */
  phase: 'input' | 'output';
  /** 裁剪后的 row 样本。 */
  rows: Array<ExternalRow>;
};

/** data lineage 事件。 */
export type DataLineageEvent =
  | DataLineageSourceEvent
  | DataLineageTransformStepEvent
  | DataLineageFieldFlowEvent
  | DataLineageReducerEvent
  | DataLineageSelectorEvent
  | DataLineageSampleEvent;

/** data lineage 事件 sink。 */
export type DataLineageSink = (event: DataLineageEvent) => void;

/** transform step 记录输入。 */
export type DataLineageTransformStepInput = {
  /** transform 在声明数组中的下标。 */
  operationIndex: number;
  /** transform operation。 */
  operation: IRDataTransform;
  /** 输入行。 */
  inputRows: Array<ExternalRow>;
  /** 输出行。 */
  outputRows: Array<ExternalRow>;
  /** definition 声明的输入字段。 */
  inputFields: Array<string>;
  /** definition 声明的输出字段。 */
  outputFields: Array<string>;
};

/** reducer 记录输入。 */
export type DataLineageReducerInput = {
  /** reducer operation。 */
  operation: IRDataReducerOperation;
  /** reducer 本次消费的行。 */
  rows: Array<ExternalRow>;
  /** definition 声明的输入字段。 */
  inputFields: Array<string>;
  /** definition 声明的输出字段。 */
  outputFields: Array<string>;
};

/** selector 记录输入。 */
export type DataLineageSelectorInput = {
  /** selector operation。 */
  operation: IRDataSelectorOperation;
  /** selector 本次消费的行。 */
  rows: Array<ExternalRow>;
  /** selector 选中的行。 */
  selectedRows: Array<ExternalRow>;
  /** definition 声明的输入字段。 */
  inputFields: Array<string>;
};

/** data lineage recorder：由 pipeline 创建，contract / providers 只消费抽象协议。 */
export type DataLineageRecorder = {
  /** 记录原始输入数据来源。 */
  recordSource: (rows: Array<ExternalRow>) => void;
  /** 记录 transform step。 */
  recordTransformStep: (input: DataLineageTransformStepInput) => void;
  /** 记录 reducer 操作。 */
  recordReducerOperation: (input: DataLineageReducerInput) => void;
  /** 记录 selector 操作。 */
  recordSelectorOperation: (input: DataLineageSelectorInput) => void;
};

/** data lineage 运行结果。 */
export type DataLineageRun = {
  /** 本次运行记录到的事件。 */
  events: Array<DataLineageEvent>;
};

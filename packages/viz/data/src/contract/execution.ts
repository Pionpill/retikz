import type {
  IRDataExecution,
  IRDataModel,
  IRDataReducerOperation,
  IRDataSelectorOperation,
  IRDataTransform,
  IRRegressionMethod,
} from '../schemas';
import type { ExternalRow } from '../shared';
import type { DataLineageOptions, DataLineageRun } from './lineage';
import type { AnyRegressionDefinition } from './regression';
import type { AnyRegressionImplementation } from './regression';
import type { AnyRowSelectorDefinition, AnyStatisticsReducerDefinition } from './statistics';
import type { AnyStatisticsReducerImplementation, AnyRowSelectorImplementation } from './statistics';
import type { AnyTransformDefinition } from './transform';
import type { AnyTransformImplementation } from './transform';

/** 规范逻辑字段模型；不重复执行源格式解析 */
export type DataTransformModel = Array<Pick<IRDataModel[number], 'name' | 'type' | 'order'>>;

/** 变换的精确统计依赖及本次请求的语义身份 */
export type DataTransformDependency =
  | Readonly<{ type: 'reducer'; operation: IRDataReducerOperation; definition: AnyStatisticsReducerDefinition }>
  | Readonly<{ type: 'selector'; operation: IRDataSelectorOperation; definition: AnyRowSelectorDefinition }>
  | Readonly<{ type: 'regression'; operation: IRRegressionMethod; definition: AnyRegressionDefinition }>;

/** 按声明顺序解析的单个变换阶段 */
export type DataTransformStage = Readonly<{
  /** 当前阶段的唯一语义身份 */
  definition: AnyTransformDefinition;
  /** 精确 schema 解析后的参数 */
  operation: IRDataTransform;
  /** 此声明的稀疏配置 */
  dataExecution?: IRDataExecution;
  /** 全部间接计算依赖 */
  dependencies: Array<DataTransformDependency>;
  /** 当前阶段的完整预期输出模型 */
  outputModel: DataTransformModel;
}>;

/** 不依赖行数据的语义解析结果 */
export type DataTransformResolution = Readonly<{
  /** 第一阶段输入模型 */
  inputModel: DataTransformModel;
  /** 固定声明顺序的阶段 */
  stages: Array<DataTransformStage>;
}>;

/** 实际计算结果；事件历史不替代行级 provenance */
export type DataTransformResult = Readonly<{
  /** 规范值行及可选 runtime 来源标记 */
  rows: Array<ExternalRow>;
  /** 实际输出字段及类型证据 */
  model: DataTransformModel;
  /** 实际执行事件 */
  lineage?: DataLineageRun;
}>;

/** 预检失败的可定位诊断 */
export type DataTransformDiagnostic = Readonly<{
  /** 零基声明下标；源级失败可省略 */
  operationIndex?: number;
  /** 可用的参数或依赖位置 */
  path?: string;
  /** 稳定诊断分类 */
  code: string;
  /** 失败原因 */
  message: string;
}>;

/** 实际阶段输入；原生源仅用于第一阶段 */
export type DataTransformStageInput<TSource> =
  | Readonly<{ kind: 'source'; source: TSource; model: DataTransformModel }>
  | Readonly<{ kind: 'result'; result: DataTransformResult }>;

/** 模型预检输入；下游结果尚未生成时不需提供假 rows */
export type DataTransformInputDescriptor<TSource> =
  | Readonly<{ kind: 'source'; source: TSource; model: DataTransformModel }>
  | Readonly<{ kind: 'result'; model: DataTransformModel }>;

/** 整次请求固定的来源与事件保留要求 */
export type DataTransformExecutionRequirements = Readonly<{
  /** 各阶段是否必须保留本次输入已有的真实来源 */
  preserveProvenance: boolean;
  /** 可选事件开关、采样预算与 sink */
  lineage?: DataLineageOptions;
}>;

/** 单次调用的宿主配置；不改变执行器默认值 */
export type DataTransformRequestOptions = Readonly<{
  /** 宿主根执行配置 */
  dataExecution?: IRDataExecution;
  /** 请求保留本次输入真实来源 */
  provenance?: boolean;
  /** 事件记录要求 */
  lineage?: DataLineageOptions;
  /** 请求取消信号 */
  signal?: AbortSignal;
}>;

/** 引用相同语义 Definition 的阶段计算入口 */
export type DataTransformStageImplementation<TSource> = Readonly<{
  /** 经过 adapter 明确适配的语义身份 */
  definition: AnyTransformDefinition;
  /** 消费本次实际输入，不重新查询原始 source */
  execute: (input: DataTransformStageInput<TSource>) => DataTransformResult | Promise<DataTransformResult>;
}>;

/** 支持声明与能力查询异常分离 */
export type DataTransformStageSupport<TSource> =
  | Readonly<{ kind: 'supported'; implementation: DataTransformStageImplementation<TSource> }>
  | Readonly<{ kind: 'unsupported'; diagnostics: Array<DataTransformDiagnostic> }>;

/** 按模型及真实源能力匹配，不计算或搬运行数据 */
export type DataTransformImplementationProvider<TSource> = Readonly<{
  /** 返回当前参数、统计依赖、输入形态与来源要求的支持结果 */
  resolve: (
    stage: DataTransformStage,
    context: Readonly<{
      operationIndex: number;
      input: DataTransformInputDescriptor<TSource>;
      requirements: DataTransformExecutionRequirements;
      signal?: AbortSignal;
    }>,
  ) => DataTransformStageSupport<TSource> | Promise<DataTransformStageSupport<TSource>>;
}>;

/** 具名外部入口；注册本身不启用外部模式 */
export type DataTransformProviderRegistration<TSource> = Readonly<{
  /** 执行配置中引用的唯一名称 */
  name: string;
  /** 本次执行器的能力 provider */
  provider: DataTransformImplementationProvider<TSource>;
}>;

/** 有作用域的执行器默认值与本地/外部计算实现 */
export type DataTransformExecutionOptions<TSource> = Readonly<{
  /** 最低优先级的执行配置 */
  dataExecution?: IRDataExecution;
  /** 按唯一名称引用的外部入口 */
  externalProviders?: ReadonlyArray<DataTransformProviderRegistration<TSource>>;
  /** 显式本地 transform 计算 */
  transformImplementations?: ReadonlyArray<AnyTransformImplementation>;
  /** 显式本地统计计算 */
  statisticsReducerImplementations?: ReadonlyArray<AnyStatisticsReducerImplementation>;
  /** 显式本地选择计算 */
  rowSelectorImplementations?: ReadonlyArray<AnyRowSelectorImplementation>;
  /** 显式本地拟合计算 */
  regressionImplementations?: ReadonlyArray<AnyRegressionImplementation>;
  /** 明确授权的规范源物化；只在全部预检完成后调用 */
  materializeSource?: (
    source: TSource,
    model: DataTransformModel,
    context: Readonly<{
      requirements: DataTransformExecutionRequirements;
      signal?: AbortSignal;
    }>,
  ) => DataTransformResult | Promise<DataTransformResult>;
}>;

/** 一个真实输入的单次执行权 */
export type DataTransformExecution = Readonly<{
  /** 第一次调用即消耗；等待、成功、失败或取消后均不可再次调用 */
  execute: () => DataTransformResult | Promise<DataTransformResult>;
}>;

/** 本请求固定的模型计划，可绑定尚未生成的不同分区 */
export type DataTransformPreparation<TSource> =
  | Readonly<{
      kind: 'ready';
      bind: (input: DataTransformStageInput<TSource>) => DataTransformExecution;
    }>
  | Readonly<{ kind: 'unsupported'; diagnostics: Array<DataTransformDiagnostic> }>;

/** 模型预检与实际计算绑定分离的执行器 */
export type DataTransformExecutor<TSource> = Readonly<{
  /** 固定全部阶段选择；bind/execute 不重新路由 */
  prepare: (
    input: DataTransformInputDescriptor<TSource>,
    resolution: DataTransformResolution,
    options?: DataTransformRequestOptions,
  ) => DataTransformPreparation<TSource> | Promise<DataTransformPreparation<TSource>>;
}>;

/** 宿主数据引用的真实 runtime 输入 */
export type DataInputBinding<TSource> =
  | Readonly<{ kind: 'rows'; rows: Array<ExternalRow> }>
  | Readonly<{ kind: 'result'; result: DataTransformResult }>
  | Readonly<{ kind: 'source'; source: TSource }>;

/** 引擎句柄、行数据和函数均不进入 JSON IR */
export type DataInputBindings<TSource> = Readonly<Record<string, DataInputBinding<TSource>>>;

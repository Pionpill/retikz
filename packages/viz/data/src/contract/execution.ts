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
export type DataTransformModel = Array<DataTransformField<IRDataModel[number]>>;

/** 按字段分支投影，保留测量类型与分类顺序的关联 */
type DataTransformField<TField extends IRDataModel[number]> = TField extends IRDataModel[number]
  ? Pick<TField, 'name' | 'type' | 'order'>
  : never;

/** 变换的精确统计依赖及本次请求的语义身份 */
export type DataTransformDependency =
  | Readonly<{
      /** 区分归约、行选择与拟合依赖 */
      type: 'reducer';
      /** 该依赖的精确操作声明 */
      operation: IRDataReducerOperation;
      /** 与操作匹配的语义定义 */
      definition: AnyStatisticsReducerDefinition;
    }>
  | Readonly<{
      /** 区分归约、行选择与拟合依赖 */
      type: 'selector';
      /** 该依赖的精确操作声明 */
      operation: IRDataSelectorOperation;
      /** 与操作匹配的语义定义 */
      definition: AnyRowSelectorDefinition;
    }>
  | Readonly<{
      /** 区分归约、行选择与拟合依赖 */
      type: 'regression';
      /** 该依赖的精确操作声明 */
      operation: IRRegressionMethod;
      /** 与操作匹配的语义定义 */
      definition: AnyRegressionDefinition;
    }>;

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

/**
 * 实际阶段输入；原生源仅用于第一阶段
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源
 */
export type DataTransformStageInput<TSource> =
  | Readonly<{
      /** 区分首阶段原生源和前一阶段计算结果 */
      kind: 'source';
      /** 只供首阶段消费的原生数据源句柄 */
      source: TSource;
      /** 输入源已确定的字段模型 */
      model: DataTransformModel;
    }>
  | Readonly<{
      /** 区分首阶段原生源和前一阶段计算结果 */
      kind: 'result';
      /** 前一阶段实际生成的数据行、模型及来源记录 */
      result: DataTransformResult;
    }>;

/**
 * 模型预检输入；下游结果尚未生成时不需提供假 rows
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源
 */
export type DataTransformInputDescriptor<TSource> =
  | Readonly<{
      /** 区分原生源预检与下游结果模型预检 */
      kind: 'source';
      /** 用于查询执行能力的原生源句柄，不在预检中读取行 */
      source: TSource;
      /** 当前阶段预期可见的字段模型 */
      model: DataTransformModel;
    }>
  | Readonly<{
      /** 区分原生源预检与下游结果模型预检 */
      kind: 'result';
      /** 当前阶段预期可见的字段模型 */
      model: DataTransformModel;
    }>;

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

/**
 * 引用相同语义 Definition 的阶段计算入口
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源
 */
export type DataTransformStageImplementation<TSource> = Readonly<{
  /** 经过 adapter 明确适配的语义身份 */
  definition: AnyTransformDefinition;
  /** 消费本次实际输入，不重新查询原始 source */
  execute: (input: DataTransformStageInput<TSource>) => DataTransformResult | Promise<DataTransformResult>;
}>;

/**
 * 支持声明与能力查询异常分离
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源
 */
export type DataTransformStageSupport<TSource> =
  | Readonly<{
      /** 当前阶段是否可由该执行入口支持 */
      kind: 'supported';
      /** 通过能力预检的具体阶段计算入口 */
      implementation: DataTransformStageImplementation<TSource>;
    }>
  | Readonly<{
      /** 当前阶段是否可由该执行入口支持 */
      kind: 'unsupported';
      /** 无法支持当前阶段的可定位原因 */
      diagnostics: Array<DataTransformDiagnostic>;
    }>;

/**
 * 按模型及真实源能力匹配，不计算或搬运行数据
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源
 */
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

/**
 * 具名外部入口；注册本身不启用外部模式
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源
 */
export type DataTransformProviderRegistration<TSource> = Readonly<{
  /** 执行配置中引用的唯一名称 */
  name: string;
  /** 本次执行器的能力 provider */
  provider: DataTransformImplementationProvider<TSource>;
}>;

/**
 * 有作用域的执行器默认值与本地/外部计算实现
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源
 */
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

/**
 * 本请求固定的模型计划，可绑定尚未生成的不同分区
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源
 */
export type DataTransformPreparation<TSource> =
  | Readonly<{
      /** 完整模型计划准备成功或不支持的判别值 */
      kind: 'ready';
      /** 把固定模型计划绑定到一个实际输入，创建单次执行权 */
      bind: (input: DataTransformStageInput<TSource>) => DataTransformExecution;
    }>
  | Readonly<{
      /** 完整模型计划准备成功或不支持的判别值 */
      kind: 'unsupported';
      /** 模型计划无法完成时的可定位诊断 */
      diagnostics: Array<DataTransformDiagnostic>;
    }>;

/**
 * 模型预检与实际计算绑定分离的执行器
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源
 */
export type DataTransformExecutor<TSource> = Readonly<{
  /** 固定全部阶段选择；bind/execute 不重新路由 */
  prepare: (
    input: DataTransformInputDescriptor<TSource>,
    resolution: DataTransformResolution,
    options?: DataTransformRequestOptions,
  ) => DataTransformPreparation<TSource> | Promise<DataTransformPreparation<TSource>>;
}>;

/**
 * 宿主数据引用的真实 runtime 输入
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源
 */
export type DataInputBinding<TSource> =
  | Readonly<{
      /** 区分直接行数据、已完成结果与原生源绑定 */
      kind: 'rows';
      /** 直接提供的规范数据行 */
      rows: Array<ExternalRow>;
    }>
  | Readonly<{
      /** 区分直接行数据、已完成结果与原生源绑定 */
      kind: 'result';
      /** 已完成的数据变换结果及字段模型 */
      result: DataTransformResult;
    }>
  | Readonly<{
      /** 区分直接行数据、已完成结果与原生源绑定 */
      kind: 'source';
      /** 交由相应执行器解释的原生数据源句柄 */
      source: TSource;
    }>;

/**
 * 引擎句柄、行数据和函数均不进入 JSON IR
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源
 */
export type DataInputBindings<TSource> = Readonly<Record<string, DataInputBinding<TSource>>>;

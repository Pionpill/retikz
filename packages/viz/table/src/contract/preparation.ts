import type {
  FieldFormatDefinition,
  FieldOrderDefinition,
  AnyTransformDefinition,
  AnyStatisticsReducerDefinition,
  AnyRowSelectorDefinition,
  AnyRegressionDefinition,
  AnySynchronousTransformImplementation,
  AnySynchronousStatisticsReducerImplementation,
  AnySynchronousRowSelectorImplementation,
  AnySynchronousRegressionImplementation,
  DataInputBindings,
  DataTransformExecutor,
  DataTransformResult,
  DataLineageOptions,
} from '@retikz/data';

/** Table直接复用Data的语义定义与同步计算选项 */
export type TableDataOptions = Readonly<{
  /** 当前请求注入的分类顺序定义 */
  fieldOrderDefinitions?: ReadonlyArray<FieldOrderDefinition>;
  /** 源格式定义 */
  formatDefinitions?: ReadonlyArray<FieldFormatDefinition>;
  /** Transform语义定义 */
  transformDefinitions?: ReadonlyArray<AnyTransformDefinition>;
  /** 统计语义定义 */
  statisticsReducerDefinitions?: ReadonlyArray<AnyStatisticsReducerDefinition>;
  /** 选行语义定义 */
  rowSelectorDefinitions?: ReadonlyArray<AnyRowSelectorDefinition>;
  /** 拟合语义定义 */
  regressionDefinitions?: ReadonlyArray<AnyRegressionDefinition>;
  /** 同步Transform计算 */
  transformImplementations?: ReadonlyArray<AnySynchronousTransformImplementation>;
  /** 同步统计计算 */
  statisticsReducerImplementations?: ReadonlyArray<AnySynchronousStatisticsReducerImplementation>;
  /** 同步选行计算 */
  rowSelectorImplementations?: ReadonlyArray<AnySynchronousRowSelectorImplementation>;
  /** 同步拟合计算 */
  regressionImplementations?: ReadonlyArray<AnySynchronousRegressionImplementation>;
}>;

/**
 * Table异步数据准备输入，运行时句柄不进入IR
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export type TableDataPreparationOptions<TSource = never> = Readonly<{
  /** 规范结果、原生源或原始行绑定 */
  dataBindings: DataInputBindings<TSource>;
  /** 执行器默认值与外部入口 */
  dataTransformExecutor?: DataTransformExecutor<TSource>;
  /** 请求取消信号 */
  signal?: AbortSignal;
  /** Data执行事件记录选项 */
  lineage?: DataLineageOptions;
}>;

/** 所有数据预检已完成后的单次Table执行权 */
export type TableDataPreparation = Readonly<{
  /** Manual或无数据Custom没有数据结果 */
  execute: () => Promise<DataTransformResult | undefined>;
}>;

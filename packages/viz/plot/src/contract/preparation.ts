import type { DataInputBindings, DataLineageOptions, DataTransformExecutor, DataTransformResult } from '@retikz/data';

/** 一个 Plot 作者实例的已完成数据计算；不进入 Source IR */
export type PreparedPlotData = Readonly<{
  /** 根变换结果 */
  root: DataTransformResult;
  /** 根作用域各 mark 的结果 */
  marks: ReadonlyArray<DataTransformResult>;
  /** 按实际 facet panel 和 mark 顺序排列的结果 */
  panels: ReadonlyArray<ReadonlyArray<DataTransformResult>>;
}>;

/**
 * Plot 异步准备的 runtime 配置
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源
 */
export type PlotDataPreparationOptions<TSource> = Readonly<{
  /** 按既有 data.reference 绑定的规范输入 */
  dataBindings: DataInputBindings<TSource>;
  /** 本次准备使用的执行器 */
  dataTransformExecutor?: DataTransformExecutor<TSource>;
  /** 全部阶段共用的取消信号 */
  signal?: AbortSignal;
  /** 数据执行事件记录要求 */
  lineage?: DataLineageOptions;
}>;

/** 完成全部模型预检后才提供的单次 Plot 计算权 */
export type PlotDataPreparation = Readonly<{
  /** 计算根与所有真实 mark/facet 输入 */
  execute: () => Promise<PreparedPlotData>;
}>;

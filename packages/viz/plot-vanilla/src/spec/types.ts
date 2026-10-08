import type { DataInputBindings, DataTransformExecutor, ExternalDatasets } from '@retikz/data';
import type {
  IRPlot,
  LowerPlotsOptions,
  PlotHostLineageMetadata,
  PlotLineageOptions,
  PlotLineageRun,
  PreparedPlotData,
} from '@retikz/plot';
import type { InputScope } from '@retikz/vanilla';

import type { InputPlot } from '../normalize/plot';

/** Plot 嵌入到场景时可选的面板 Scope 输入 */
export type InputPlotPanel = Pick<InputScope, 'clip' | 'position' | 'theme' | 'transforms' | 'zIndex'>;

/** Plot source 的显式阶段互斥输入 */
export type PlotSource =
  | Readonly<{
      /** 需要由 Plot Vanilla 归一化的 framework-neutral authoring input */
      input: InputPlot;
      /** 同一 source 不得同时提供 IRPlot */
      spec?: never;
    }>
  | Readonly<{
      /** 已完成的 Plot Source IR */
      spec: IRPlot;
      /** 同一 source 不得同时提供 authoring input */
      input?: never;
    }>;

/**
 * Plot InputEmbed 交给 adapter 的属性
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export type InputPlotEmbed<TSource = never> = PlotSource &
  (
    | Readonly<{
        /** 以数据引用名索引的外部行数据集，与 dataBindings 互斥 */
        datasets: ExternalDatasets;
        dataBindings?: never;
      }>
    | Readonly<{
        /** 行数据或原生数据源的运行时绑定，与 datasets 互斥 */
        dataBindings: DataInputBindings<TSource>;
        datasets?: never;
      }>
  ) &
  Readonly<{
    /** 通用异步 transform 执行器，不进入 Source IR */
    dataTransformExecutor?: DataTransformExecutor<TSource>;
    /** 此 Plot 的外部请求取消信号 */
    signal?: AbortSignal;
    /** 可选的同次数据链路记录 */
    lineage?: false | PlotLineageOptions;
    /** 链路宿主元数据 */
    hostLineageMetadata?: PlotHostLineageMetadata;
    /** 同次完整帧提交后通知，不在 preparation 中调用 */
    onLineage?: (lineage: PlotLineageRun) => void;
    /** 将绘图描述降低为 Core 图元时的运行时选项 */
    lowerOptions?: LowerPlotsOptions;
    /** 作用于 Plot 根节点的可选 Core Scope */
    panel?: InputPlotPanel;
  }>;

/** Plot contribution 提供给同 revision compile driver 的链路消费输入 */
export type PreparedPlotLineageNotification = Readonly<{
  /** 本请求借用的作者 Source */
  spec: IRPlot;
  /** 已完成的数据计算 */
  preparedData: PreparedPlotData;
  /** 同次 lowering 配置 */
  lowerOptions?: LowerPlotsOptions;
  /** 链路配置 */
  lineage: PlotLineageOptions;
  /** 元数据 */
  hostLineageMetadata?: PlotHostLineageMetadata;
  /** 帧成功提交后的通知 */
  onLineage: (lineage: PlotLineageRun) => void;
}>;

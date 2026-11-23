import type { ExternalDatasets } from '@retikz/data';
import type { RequireExactlyOne } from '@retikz/foundation';
import type {
  IRPlot,
  PlotsLoweringOptions,
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
export type PlotSource = RequireExactlyOne<{
  /** 需要由 Plot Vanilla 归一化的 framework-neutral authoring input */
  readonly input: InputPlot;
  /** 已完成的 Plot Source IR */
  readonly spec: IRPlot;
}>;

/**
 * Plot InputEmbed 交给 adapter 的属性
 */
export type InputPlotEmbed = PlotSource &
  RequireExactlyOne<{
    /** 以数据引用名索引的外部行数据集，与 preparedData 互斥 */
    readonly datasets: ExternalDatasets;
    /** 已完成的 Plot 数据计算结果，与 datasets 互斥 */
    readonly preparedData: PreparedPlotData;
  }> &
  Readonly<{
    /** 可选的同次数据链路记录 */
    lineage?: false | PlotLineageOptions;
    /** 链路宿主元数据 */
    hostLineageMetadata?: PlotHostLineageMetadata;
    /** 同次完整帧提交后通知，不在 preparation 中调用 */
    onLineage?: (lineage: PlotLineageRun) => void;
    /** 将绘图描述降低为 Core 图元时的运行时选项 */
    lowerOptions?: PlotsLoweringOptions;
    /** 作用于 Plot 根节点的可选 Core Scope */
    panel?: InputPlotPanel;
  }>;

/** Plot contribution 提供给同 revision compile result extension 的链路消费输入 */
export type PreparedPlotLineageNotification = Readonly<{
  /** 本请求借用的作者 Source */
  spec: IRPlot;
  /** 已完成的数据计算 */
  preparedData?: PreparedPlotData;
  /** 未预计算时使用的行数据集 */
  datasets?: ExternalDatasets;
  /** 同次 lowering 配置 */
  lowerOptions?: PlotsLoweringOptions;
  /** 链路配置 */
  lineage: PlotLineageOptions;
  /** 元数据 */
  hostLineageMetadata?: PlotHostLineageMetadata;
  /** 帧成功提交后的通知 */
  onLineage: (lineage: PlotLineageRun) => void;
}>;

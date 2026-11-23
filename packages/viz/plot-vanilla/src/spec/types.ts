import type { ExternalDatasets } from '@retikz/data';
import type { RequireExactlyOne } from '@retikz/foundation';
import type { IRPlot, PlotsLoweringOptions, PreparedPlotData } from '@retikz/plot';
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
    /** 将绘图描述降低为 Core 图元时的运行时选项 */
    lowerOptions?: PlotsLoweringOptions;
    /** 作用于 Plot 根节点的可选 Core Scope */
    panel?: InputPlotPanel;
  }>;

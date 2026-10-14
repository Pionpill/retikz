import type { BoundsInsets, BoundsRect } from '@retikz/math';

import type { TickSet } from '../../../contract';
import type { IRPlotAxisGuide } from '../../../schemas';
import type { PlotLabelMeasure } from '../../../shared';

/** 单根轴参与绘图区布局的上下文 */
export type PlotAxisLayoutContext = {
  /** 轴的维度、位置与标签配置 */
  guide: IRPlotAxisGuide;
  /** 当前布局轮次使用的可见刻度 */
  ticks: TickSet;
};

/** 绘图区布局所需的完整内部上下文 */
export type PlotAreaLayoutContext = {
  /** 分配给当前图的局部尺寸 */
  size: {
    /** 可用宽度，单位为 user units */
    width: number;
    /** 可用高度，单位为 user units */
    height: number;
  };
  /** 参与布局的轴，保留各自配置与刻度 */
  axes: ReadonlyArray<PlotAxisLayoutContext>;
  /** 图例、装饰与布局反馈合并后的四边额外预留 */
  reserve?: Partial<BoundsInsets>;
  /** 用户逐边覆盖自动计算的留白 */
  margin?: Partial<BoundsInsets>;
  /** 与实绘一致的文字测量环境 */
  text: {
    /** Core 提供的文字测量能力 */
    measure: PlotLabelMeasure;
    /** 标签缺省字号 */
    fontSize: number;
  };
};

/** 绘图区及最终四边留白 */
export type PlotAreaLayout = {
  /** 当前分配区域内的绘图区 */
  plotArea: BoundsRect;
  /** 最终四边留白 */
  margins: BoundsInsets;
};

import type { IRPlotAxisGuide, IRPlotLegendGuide } from '@retikz/plot';

import type { InputPlotPositionScaleType } from './input-scales';

/** <PlotAxis> props：坐标轴配置；网格走 axis-level `grid`（与 IR axis.grid 对应，非独立 <Grid> 组件） */
export type InputPlotAxis = {
  /**
   * 装饰哪个定位维度：cartesian 的 x（水平）/ y（垂直）；polar 的 x（角向）/ y（径向）；
   * custom coordinate 使用 definition 声明的 role。维度须匹配坐标系合法集，否则 lowering fail-loud
   */
  dimension: string;
  /** 位置 scale 快捷配置；对可缩放维度等价于同维度的 <PlotScale dimension={dimension} type={scale} /> */
  scale?: InputPlotPositionScaleType;
  /** 轴线样式；false 隐藏轴线但保留 ticks / labels / grid */
  line?: IRPlotAxisGuide['line'];
  /** 刻度来源和刻度线样式；grid 复用同一批 ticks */
  ticks?: IRPlotAxisGuide['ticks'];
  /** 轴线交叉值处的 tick / label 冲突策略 */
  crossing?: IRPlotAxisGuide['crossing'];
  /** 刻度标签开关、格式化和文本样式；false 隐藏刻度标签，缺省显示 */
  tickLabels?: IRPlotAxisGuide['tickLabels'];
  /** 是否画对齐本轴刻度的网格线，以及在组合坐标中投放到哪些目标；缺省 = false */
  grid?: IRPlotAxisGuide['grid'];
  coordinateView?: string;
  facetId?: string;
  scaffoldId?: string;
  trackId?: string;
  placement?: IRPlotAxisGuide['placement'];
  title?: IRPlotAxisGuide['title'];
  /** 语义图层覆盖；控制坐标轴外层 scope 在 plot 内的 zIndex */
  layer?: IRPlotAxisGuide['layer'];
  /** 可选 guide 句柄，用于稳定标识生成的坐标轴 */
  id?: string;
};

/**
 * 坐标轴声明组件
 * @description 配置载体：不进 React render 栈、不渲染（返回 null），由 <Plot> 同步内省其 props 装配进 IRPlot.guides
 */

/** <PlotLegend> props：图例配置；channel 指定非位置通道，颜色形态来自 scale，其它形态来自 ChannelDefinition.legend */
export type InputPlotLegend = {
  /** 可视化哪个非位置通道：color（颜色）/ size（尺寸）/ opacity（透明度）/ shape（形状） */
  channel: string;
  /** 消歧 scale name（同通道被多个 scale 驱动时指定；省略 = 该通道唯一 scale，多于一个且省略 → lowering fail-loud） */
  scale?: string;
  /** 图例标题；支持字符串、多行文本和 styled text block */
  title?: IRPlotLegendGuide['title'];
  /** 图例位置（预留带所在边）；缺省 = right */
  position?: 'right' | 'left' | 'top' | 'bottom';
  /** 条目排布方向；省略 = 按 position（左右→vertical、上下→horizontal） */
  orient?: 'vertical' | 'horizontal';
  /** ramp 的完整刻度来源；size 只读取 count，离散色块和 shape 忽略 */
  ticks?: IRPlotLegendGuide['ticks'];
  /** 是否显示条目 / 刻度标签，以及 ramp 的标签格式；缺省 = true */
  tickLabels?: IRPlotLegendGuide['tickLabels'];
  /** 图例本地视觉 token；覆盖 Plot theme.legend */
  style?: IRPlotLegendGuide['style'];
  /** 语义图层覆盖；控制图例外层 scope 在 plot 内的 zIndex */
  layer?: IRPlotLegendGuide['layer'];
};

/**
 * 图例声明组件
 * @description 配置载体：不进 React render 栈、不渲染（返回 null），由 <Plot> 同步内省其 props 装配进 IRPlot.guides；
 *   <PlotLegend> 不抑制默认坐标轴（与 <PlotAxis> 区分），图例与默认轴共存
 */

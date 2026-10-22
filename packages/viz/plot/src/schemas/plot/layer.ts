import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';
import { number, strictObject } from 'zod';

/**
 * Plot 语义图层的默认 core zIndex
 * @description 数值只表达跨语义层的默认堆叠；同层内仍由源码顺序或局部机制决定
 */
export const PlotLayerZIndex = {
  /** Plot 背景层，位于所有可视内容下方 */
  Background: -1000,
  /** 坐标网格层，位于背景之上、数据图元之下 */
  Grid: -300,
  /** 数据图元层，作为 Plot 内容的默认堆叠基线 */
  Mark: 0,
  /** 坐标轴层，用于轴线、刻度及其标签 */
  Axis: 200,
  /** 分面标签层，用于各分面区域的标题或标识 */
  FacetLabel: 300,
  /** 图例层，位于其它绘图内容之上 */
  Legend: 500,
  /** 交互覆盖层，用于需要置于其他语义内容之上的交互反馈 */
  Interaction: 900,
} as const;

export type PlotLayerZIndex = ValueOf<typeof PlotLayerZIndex>;

/** 校验绘图语义图层的堆叠次序覆盖 */
export const PlotLayerSchema = strictObject({
  zIndex: number()
    .int()
    .optional()
    .describe('Core zIndex override for this semantic plot layer; omit to use the layer default'),
}).describe('Plot semantic layer stacking override');

/** Plot 语义图层的堆叠次序覆盖 */
export type IRPlotLayer = ZodInfer<typeof PlotLayerSchema>;

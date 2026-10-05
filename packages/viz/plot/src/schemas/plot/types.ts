import type { infer as ZodInfer, input as ZodInput } from 'zod';

import type { PlotPartitionDimensionSchema, PlotPartitionScalarSchema } from './partition';
import type { PlotFacetConfigurationSchema, PlotFacetOptionsSchema, PlotSchema } from './schema';

/** Plot IR 根节点（plot composite 节点） */
export type IRPlot = Omit<ZodInfer<typeof PlotSchema>, 'coordinate' | 'composition'> &
  Pick<ZodInput<typeof PlotSchema>, 'coordinate' | 'composition'>;

/** Plot 与高层图表共同复用的 JSON-safe facet 作者配置 */
export type IRPlotFacetConfiguration = ZodInfer<typeof PlotFacetConfigurationSchema>;

/** facet使用的有限JSON partition scalar */
export type PlotPartitionScalar = ZodInfer<typeof PlotPartitionScalarSchema>;

/** Plot partition字段、顺序与label声明 */
export type IRPlotPartitionDimension = ZodInfer<typeof PlotPartitionDimensionSchema>;

/** 不含identity与dimension的facet选项 */
export type IRPlotFacetOptions = ZodInfer<typeof PlotFacetOptionsSchema>;

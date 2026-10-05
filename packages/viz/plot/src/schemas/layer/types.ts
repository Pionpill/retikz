import type { infer as ZodInfer } from 'zod';

import type { PlotLayerSchema } from './schema';

/** Plot 图层声明：一个 mark 及其局部 transform / encoding 配置 */
export type IRPlotLayer = ZodInfer<typeof PlotLayerSchema>;

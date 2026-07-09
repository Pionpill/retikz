import type { z } from 'zod';

import type { PlotLayerSchema } from './schema';

/** Plot 图层声明：一个 mark 及其局部 transform / encoding 配置。 */
export type PlotLayer = z.infer<typeof PlotLayerSchema>;

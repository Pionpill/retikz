import type { ValueOf } from '@retikz/foundation';
import type { z } from 'zod';

import type { PlotLayerZIndex } from './constants';
import type { PlotLayerSchema } from './schema';

export type PlotLayerZIndexValue = ValueOf<typeof PlotLayerZIndex>;

/** Plot 图层声明：一个 mark 及其局部 transform / encoding 配置 */
export type IRPlotLayer = z.infer<typeof PlotLayerSchema>;

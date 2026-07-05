import type { z } from 'zod';

import type { PlotLayerSchema } from './schema';

export type PlotLayer = z.infer<typeof PlotLayerSchema>;

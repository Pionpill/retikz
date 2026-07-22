import { z } from 'zod';

export const PlotLayerSchema = z
  .strictObject({
    zIndex: z
      .number()
      .int()
      .optional()
      .describe('Core zIndex override for this semantic plot layer; omit to use the layer default'),
  })
  .describe('Plot semantic layer stacking override');

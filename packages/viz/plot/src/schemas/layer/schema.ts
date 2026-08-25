import { number, strictObject } from 'zod';

export const PlotLayerSchema = strictObject({
  zIndex: number()
    .int()
    .optional()
    .describe('Core zIndex override for this semantic plot layer; omit to use the layer default'),
}).describe('Plot semantic layer stacking override');

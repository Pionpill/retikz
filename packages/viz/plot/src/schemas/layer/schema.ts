import { z } from 'zod';

/**
 * Plot 语义图层覆盖配置。
 * @description 用于覆盖 mark、guide、legend、plot label 等语义层落到 core scope 上的 zIndex。
 */
export const PlotLayerSchema = z
  .strictObject({
    zIndex: z
      .number()
      .int()
      .optional()
      .describe('Core zIndex override for this semantic plot layer; omit to use the layer default'),
  })
  .describe('Plot semantic layer stacking override');

import { PlotShapePaletteSchema } from '../../schemas';

/** shape 分类通道的默认八项有序调色板 */
export const PLOT_SHAPE_PALETTE = PlotShapePaletteSchema.parse([
  'circle',
  'rectangle',
  'diamond',
  'cross',
  { type: 'polygon', params: { sides: 3, rotate: -90 } },
  { type: 'polygon', params: { sides: 3, rotate: 90 } },
  { type: 'polygon', params: { sides: 5, rotate: -90 } },
  { type: 'polygon', params: { sides: 6, rotate: 0 } },
]);

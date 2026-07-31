import type { AnyCellVisualScaleDefinition } from '../../contract';

import { ORDINAL_COLOR_CELL_VISUAL_SCALE } from './ordinal';
import { SEQUENTIAL_COLOR_CELL_VISUAL_SCALE } from './sequential';
import { THRESHOLD_COLOR_CELL_VISUAL_SCALE } from './threshold';

/** 内置 Table Cell visual scale definitions */
export const BUILTIN_CELL_VISUAL_SCALES: ReadonlyArray<AnyCellVisualScaleDefinition> = [
  ORDINAL_COLOR_CELL_VISUAL_SCALE,
  SEQUENTIAL_COLOR_CELL_VISUAL_SCALE,
  THRESHOLD_COLOR_CELL_VISUAL_SCALE,
];

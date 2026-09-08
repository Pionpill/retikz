import type { JsonObject } from '@retikz/foundation';

import type { CellVisualScaleDefinition } from './types';

/** 定义一个 Table Cell visual scale provider */
export const defineCellVisualScale = <TOptions extends JsonObject>(
  definition: CellVisualScaleDefinition<TOptions>,
): CellVisualScaleDefinition<TOptions> => definition;

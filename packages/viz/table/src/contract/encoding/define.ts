import type { IRJsonObject } from '@retikz/core';

import type { CellVisualScaleDefinition } from './types';

/** 定义一个 Table Cell visual scale provider */
export const defineCellVisualScale = <TOptions extends IRJsonObject>(
  definition: CellVisualScaleDefinition<TOptions>,
): CellVisualScaleDefinition<TOptions> => definition;

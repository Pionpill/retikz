import type { IRJsonObject } from '@retikz/core';

import type { CellPresentationDefinition } from './types';

/** 定义 Cell presentation provider 并保留 options 泛型 */
export const defineCellPresentation = <TOptions extends IRJsonObject>(
  definition: CellPresentationDefinition<TOptions>,
): CellPresentationDefinition<TOptions> => definition;

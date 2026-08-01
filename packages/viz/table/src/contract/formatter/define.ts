import type { IRJsonObject } from '@retikz/core';

import type { CellFormatterDefinition } from './types';

/** 定义 Cell formatter provider 并保留 options 泛型 */
export const defineCellFormatter = <TOptions extends IRJsonObject>(
  definition: CellFormatterDefinition<TOptions>,
): CellFormatterDefinition<TOptions> => definition;

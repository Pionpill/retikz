import type { JsonObject } from '@retikz/foundation';

import type { CellFormatterDefinition } from './types';

/** 定义 Cell formatter provider 并保留 options 泛型 */
export const defineCellFormatter = <TOptions extends JsonObject>(
  definition: CellFormatterDefinition<TOptions>,
): CellFormatterDefinition<TOptions> => definition;

import type { JsonObject } from '@retikz/foundation';

import type { CellVisualScaleDefinition } from './types';

/**
 * 定义一个 Table Cell visual scale provider
 * @template TOptions optionsSchema 解析后交给能力回调的 JSON 选项类型
 */
export const defineCellVisualScale = <TOptions extends JsonObject>(
  definition: CellVisualScaleDefinition<TOptions>,
): CellVisualScaleDefinition<TOptions> => definition;

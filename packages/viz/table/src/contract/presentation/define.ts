import type { JsonObject } from '@retikz/foundation';

import type { CellPresentationDefinition } from './types';

/**
 * 定义 Cell presentation provider 并保留 options 泛型
 * @template TOptions optionsSchema 解析后交给能力回调的 JSON 选项类型
 */
export const defineCellPresentation = <TOptions extends JsonObject>(
  definition: CellPresentationDefinition<TOptions>,
): CellPresentationDefinition<TOptions> => definition;

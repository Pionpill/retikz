import type { JsonValue } from '@retikz/foundation';

import type { IRCell } from '../schema';

/** 区分 JSON 联合中的只读数组 */
const isJsonArray = (value: JsonValue): value is ReadonlyArray<JsonValue> => Array.isArray(value);

/** 仅展开当前层；嵌套结构在自身 resolve 时继续展开，不赋予命名身份 */
export const createDataCell = (value: JsonValue): IRCell => {
  if (isJsonArray(value))
    return {
      content: value.length === 0 ? '[]' : { namespace: 'standard', type: 'list', data: value },
    };
  if (value !== null && typeof value === 'object')
    return {
      content: Object.keys(value).length === 0 ? '{}' : { namespace: 'standard', type: 'map', data: value },
    };
  return { content: JSON.stringify(value) };
};

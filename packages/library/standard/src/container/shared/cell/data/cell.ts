import type { JsonValue } from '@retikz/foundation';

import type { IRCell } from '../schema';
import { DataObjectDisplay } from './constants';
import type { DataObjectDisplayValue } from './constants';

/** 区分 JSON 联合中的只读数组 */
const isJsonArray = (value: JsonValue): value is ReadonlyArray<JsonValue> => Array.isArray(value);

/** 仅展开当前层；嵌套结构在自身 resolve 时继续展开，不赋予命名身份 */
export const createDataCell = (value: JsonValue, objectDisplay: DataObjectDisplayValue): IRCell => {
  const displayOption = objectDisplay === DataObjectDisplay.Text ? { dataObjectDisplay: objectDisplay } : {};
  if (isJsonArray(value))
    return {
      content: value.length === 0 ? '[]' : { namespace: 'standard', type: 'list', data: value, ...displayOption },
    };
  if (value !== null && typeof value === 'object')
    return {
      content:
        Object.keys(value).length === 0 || objectDisplay === DataObjectDisplay.Text
          ? JSON.stringify(value)
          : { namespace: 'standard', type: 'map', data: value, ...displayOption },
    };
  return { content: JSON.stringify(value) };
};

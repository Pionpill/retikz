import type { JsonValue } from '@retikz/foundation';

import type { IRCell } from '../schema';
import { DataObjectDisplay } from './constants';
import type { DataObjectDisplayValue } from './constants';

/** 区分 JSON 联合中的只读数组 */
const isJsonArray = (value: JsonValue): value is ReadonlyArray<JsonValue> => Array.isArray(value);

/** 展开 JSON 数据单元格；仅沿自动生成的子树传递 List 内容宽度，不赋予命名身份 */
export const createDataCell = (
  value: JsonValue,
  objectDisplay: DataObjectDisplayValue,
  inheritContentWidth = false,
): IRCell => {
  const displayOption = objectDisplay === DataObjectDisplay.Text ? { dataObjectDisplay: objectDisplay } : {};
  if (isJsonArray(value))
    return {
      content:
        value.length === 0
          ? '[]'
          : {
              namespace: 'standard',
              type: 'list',
              data: value,
              ...displayOption,
              ...(inheritContentWidth ? { layout: { width: 'content' as const } } : {}),
            },
    };
  if (value !== null && typeof value === 'object')
    return {
      content:
        Object.keys(value).length === 0 || objectDisplay === DataObjectDisplay.Text
          ? JSON.stringify(value)
          : inheritContentWidth
            ? {
                namespace: 'standard',
                type: 'map',
                entries: Object.entries(value).map(([key, childValue]) => ({
                  key,
                  value: createDataCell(childValue, objectDisplay, true),
                })),
              }
            : { namespace: 'standard', type: 'map', data: value, ...displayOption },
    };
  return { content: JSON.stringify(value) };
};

import type { JsonValue } from '@retikz/foundation';
import type { output } from 'zod';

import type { IRCell } from '../schema';
import { DataExpandComponent } from './constants';
import type { DataExpandSchema } from './schema';

/** 区分 JSON 联合中的只读数组 */
const isJsonArray = (value: JsonValue): value is ReadonlyArray<JsonValue> => Array.isArray(value);

/** 展开 JSON 数据单元格；仅沿自动生成的子树传递 Array 内容宽度，不赋予命名身份 */
export const createDataCell = (
  value: JsonValue,
  dataExpand: output<typeof DataExpandSchema>,
  inheritContentWidth = false,
): IRCell => {
  const expandArray = dataExpand === true || (dataExpand !== false && dataExpand.includes(DataExpandComponent.Array));
  const expandMap = dataExpand === true || (dataExpand !== false && dataExpand.includes(DataExpandComponent.Map));
  if (isJsonArray(value))
    return {
      content:
        value.length === 0 || !expandArray
          ? JSON.stringify(value)
          : {
              namespace: 'standard',
              type: 'array',
              data: value,
              dataExpand,
              ...(inheritContentWidth ? { layout: { width: 'content' as const } } : {}),
            },
    };

  if (value !== null && typeof value === 'object')
    return {
      content:
        Object.keys(value).length === 0 || !expandMap
          ? JSON.stringify(value)
          : inheritContentWidth
            ? {
                namespace: 'standard',
                type: 'map',
                entries: Object.entries(value).map(([key, childValue]) => ({
                  key,
                  value: createDataCell(childValue, dataExpand, true),
                })),
              }
            : { namespace: 'standard', type: 'map', data: value, dataExpand },
    };

  return { content: JSON.stringify(value) };
};

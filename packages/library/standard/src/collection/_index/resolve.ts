import type { output, input } from 'zod';

import type { CollectionIndexStyleSchema } from './schema';
import { CollectionIndexOptionsSchema } from './schema';

/** 已补全编号及位置默认值的索引，false 表示关闭 */
export type CanonicalCollectionIndex = false | output<typeof CollectionIndexOptionsSchema>;

/** 合并集合文字样式与索引覆盖，再补全自动编号和位置默认值 */
export const resolveCollectionIndex = (
  index: boolean | input<typeof CollectionIndexOptionsSchema> | undefined,
  style: input<typeof CollectionIndexStyleSchema> | undefined,
): CanonicalCollectionIndex => {
  if (index === undefined || index === false) return false;

  const options = index === true ? {} : index;
  return {
    position: options.position ?? CollectionIndexOptionsSchema.options[0].shape.position.parse(undefined),
    ...(options.labels === undefined
      ? { start: options.start ?? CollectionIndexOptionsSchema.options[0].shape.start.parse(undefined) }
      : { labels: options.labels }),
    style: {
      ...(style?.textColor === undefined ? {} : { textColor: style.textColor }),
      ...options.style,
      ...(style?.font === undefined && options.style?.font === undefined
        ? {}
        : { font: { ...style?.font, ...options.style?.font } }),
    },
  };
};

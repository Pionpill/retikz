import { createDataCell, DataExpandSchema } from '../../_cell/data';
import { resolveCell } from '../../_cell/resolve';
import type { IRMap } from '../schema';
import { MapLayoutSchema } from '../schema';
import type { CanonicalMap } from './types';

/** 解析 Map 的间距简写和键值角色，不改写稀疏 Source */
export const resolveMap = (source: IRMap): CanonicalMap => {
  const { data, entries, skeleton, dataExpand, ...input } = source;
  const expansion = dataExpand ?? DataExpandSchema.parse(undefined);
  const cells =
    skeleton !== undefined
      ? skeleton.keys.map(key => ({ key, value: {} }))
      : data === undefined
        ? entries
        : Object.entries(data).map(([key, value]) => ({
            key,
            value: createDataCell(value, expansion),
          }));
  const { style, layout, key, value } = source.defaultCell ?? {};
  const gap = source.layout?.gap ?? MapLayoutSchema.shape.gap.parse(undefined);

  return {
    ...input,
    entries: cells.map(entry => ({
      key: resolveCell(entry.key, {
        overallStyle: style,
        overallLayout: layout,
        roleStyle: key?.style,
        roleLayout: key?.layout,
        isKey: true,
      }),
      value: resolveCell(entry.value, {
        overallStyle: style,
        overallLayout: layout,
        roleStyle: value?.style,
        roleLayout: value?.layout,
      }),
    })),
    layout: { ...source.layout, gap: typeof gap === 'number' ? { row: gap, column: gap } : gap },
  };
};

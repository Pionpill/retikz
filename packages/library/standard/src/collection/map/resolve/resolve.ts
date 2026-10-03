import { createDataCell, DataObjectDisplaySchema } from '../../shared/cell/data';
import { resolveCell } from '../../shared/cell/resolve';
import type { IRMap } from '../schema';
import { MapLayoutSchema } from '../schema';
import type { CanonicalMap } from './types';
/** 解析 Map 的间距简写和键值角色，不改写稀疏 Source */
export const resolveMap = (source: IRMap): CanonicalMap => {
  const { data, entries, dataObjectDisplay, ...input } = source;
  const objectDisplay = dataObjectDisplay ?? DataObjectDisplaySchema.parse(undefined);
  const cells =
    data === undefined
      ? entries
      : Object.entries(data).map(([key, value]) => ({
          key,
          value: createDataCell(value, objectDisplay),
        }));
  const { key: keyStyle, value: valueStyle, ...style } = source.style ?? {};
  const { key: keyLayout, value: valueLayout, ...layout } = source.layout ?? {};
  const gap = layout.gap ?? MapLayoutSchema.shape.gap.parse(undefined);
  return {
    ...input,
    entries: cells.map(entry => ({
      key: resolveCell(entry.key, style, keyStyle, layout, true, keyLayout),
      value: resolveCell(entry.value, style, valueStyle, layout, false, valueLayout),
    })),
    layout: { ...source.layout, gap: typeof gap === 'number' ? { row: gap, column: gap } : gap },
  };
};

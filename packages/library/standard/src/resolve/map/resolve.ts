import type { IRMap } from '../../composites/presentation/map/schemas';
import { MapLayoutSchema } from '../../composites/presentation/map/schemas';
import { resolveCell } from '../cell';
import type { CanonicalMap } from './types';
/** 解析 Map 的间距简写和键值角色，不改写稀疏 Source */
export const resolveMap = (source: IRMap): CanonicalMap => {
  const { key: keyStyle, value: valueStyle, ...style } = source.style ?? {};
  const { key: keyLayout, value: valueLayout, ...layout } = source.layout ?? {};
  const gap = layout.gap ?? MapLayoutSchema.shape.gap.parse(undefined);
  return {
    ...source,
    entries: source.entries.map(entry => ({
      key: resolveCell(entry.key, style, keyStyle, layout, true, keyLayout),
      value: resolveCell(entry.value, style, valueStyle, layout, false, valueLayout),
    })),
    layout: { ...source.layout, gap: typeof gap === 'number' ? { row: gap, column: gap } : gap },
  };
};

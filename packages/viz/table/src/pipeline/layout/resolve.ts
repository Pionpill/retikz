import type { IRTableLayout } from '../../schemas';
import type { ResolvedTableLayoutSpec } from './types';

import { TableLayoutSchema } from '../../schemas';
import { DEFAULT_TABLE_COLUMN_WIDTH, DEFAULT_TABLE_ROW_HEIGHT, DEFAULT_TABLE_TRACK_GAP } from '../../shared';

/** 解析固定轨道 layout 并物化稳定默认值 */
export const resolveTableLayoutSpec = (spec?: IRTableLayout): ResolvedTableLayoutSpec => {
  const parsed = TableLayoutSchema.parse(spec ?? {});
  const rowHeight = parsed.rowHeight ?? DEFAULT_TABLE_ROW_HEIGHT;
  return Object.freeze({
    columnWidth: parsed.columnWidth ?? DEFAULT_TABLE_COLUMN_WIDTH,
    rowHeight,
    headerHeight: parsed.headerHeight ?? rowHeight,
    columnGap: parsed.columnGap ?? DEFAULT_TABLE_TRACK_GAP,
    rowGap: parsed.rowGap ?? DEFAULT_TABLE_TRACK_GAP,
  });
};

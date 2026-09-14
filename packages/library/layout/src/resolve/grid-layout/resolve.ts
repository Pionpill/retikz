import { resolveBoxSpacing } from '@retikz/core';

import type { IRGridLayout, IRGridPlacement } from '../../composites/grid-layout/schemas';
import { GridLayoutSchema, GridPlacementSchema } from '../../composites/grid-layout/schemas';
import { resolveLayoutContainerBox } from '../shared';
import type { CanonicalGridLayout, CanonicalGridPlacement } from './types';

/** 确定轴放置跨度，保留自动定位的空 start */
export const resolveGridPlacement = (source: IRGridPlacement | undefined): CanonicalGridPlacement => ({
  ...source,
  span: source?.span ?? GridPlacementSchema.shape.span.parse(undefined),
});

/** 在轨道测量前确定 Grid 容器与子项配置 */
export const resolveGridLayout = (source: IRGridLayout): CanonicalGridLayout => ({
  ...source,
  ...resolveLayoutContainerBox(source),
  rows: source.rows ?? GridLayoutSchema.shape.rows.parse(undefined),
  implicitColumn: source.implicitColumn ?? GridLayoutSchema.shape.implicitColumn.parse(undefined),
  implicitRow: source.implicitRow ?? GridLayoutSchema.shape.implicitRow.parse(undefined),
  autoFlow: source.autoFlow ?? GridLayoutSchema.shape.autoFlow.parse(undefined),
  overlap: source.overlap ?? GridLayoutSchema.shape.overlap.parse(undefined),
  columnGap: source.columnGap ?? GridLayoutSchema.shape.columnGap.parse(undefined),
  rowGap: source.rowGap ?? GridLayoutSchema.shape.rowGap.parse(undefined),
  justifyItems: source.justifyItems ?? GridLayoutSchema.shape.justifyItems.parse(undefined),
  alignItems: source.alignItems ?? GridLayoutSchema.shape.alignItems.parse(undefined),
  justifyContent: source.justifyContent ?? GridLayoutSchema.shape.justifyContent.parse(undefined),
  alignContent: source.alignContent ?? GridLayoutSchema.shape.alignContent.parse(undefined),
  children: (source.children ?? GridLayoutSchema.shape.children.parse(undefined)).map(item => ({
    ...item,
    margin: resolveBoxSpacing(item.margin, 0),
    column: resolveGridPlacement(item.column),
    row: resolveGridPlacement(item.row),
  })),
});

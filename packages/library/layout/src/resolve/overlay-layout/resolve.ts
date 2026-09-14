import { resolveBoxSpacing } from '@retikz/core';

import type { IROverlayLayout } from '../../composites/overlay-layout/schemas';
import { OverlayLayoutItemSchema, OverlayLayoutSchema } from '../../composites/overlay-layout/schemas';
import { resolveLayoutContainerBox } from '../shared';
import type { CanonicalOverlayLayout } from './types';

/** 在测量前确定 Overlay 容器、定位简写与堆叠配置 */
export const resolveOverlayLayout = (source: IROverlayLayout): CanonicalOverlayLayout => ({
  ...source,
  ...resolveLayoutContainerBox(source),
  justifyItems: source.justifyItems ?? OverlayLayoutSchema.shape.justifyItems.parse(undefined),
  alignItems: source.alignItems ?? OverlayLayoutSchema.shape.alignItems.parse(undefined),
  children: (source.children ?? OverlayLayoutSchema.shape.children.parse(undefined)).map(item => ({
    ...item,
    margin: resolveBoxSpacing(item.margin, 0),
    placement: OverlayLayoutItemSchema.shape.placement.parse(item.placement),
    offset: OverlayLayoutItemSchema.shape.offset.parse(item.offset),
    sizeParticipation: item.sizeParticipation ?? OverlayLayoutItemSchema.shape.sizeParticipation.parse(undefined),
    zIndex: item.zIndex ?? OverlayLayoutItemSchema.shape.zIndex.parse(undefined),
  })),
});

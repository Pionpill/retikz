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
    placement:
      item.placement === undefined
        ? OverlayLayoutItemSchema.shape.placement.parse(undefined)
        : item.placement.kind === 'aligned'
          ? item.placement
          : {
              ...item.placement,
              anchor: {
                x:
                  item.placement.anchor?.x ??
                  OverlayLayoutItemSchema.shape.placement
                    .unwrap()
                    .options[1].shape.anchor.unwrap()
                    .shape.x.parse(undefined),
                y:
                  item.placement.anchor?.y ??
                  OverlayLayoutItemSchema.shape.placement
                    .unwrap()
                    .options[1].shape.anchor.unwrap()
                    .shape.y.parse(undefined),
              },
            },
    offset: {
      x: item.offset?.x ?? OverlayLayoutItemSchema.shape.offset.unwrap().shape.x.parse(undefined),
      y: item.offset?.y ?? OverlayLayoutItemSchema.shape.offset.unwrap().shape.y.parse(undefined),
    },
    sizeParticipation: item.sizeParticipation ?? OverlayLayoutItemSchema.shape.sizeParticipation.parse(undefined),
    zIndex: item.zIndex ?? OverlayLayoutItemSchema.shape.zIndex.parse(undefined),
  })),
});

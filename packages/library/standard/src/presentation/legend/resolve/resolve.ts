import { resolveLayoutContainerBox } from '@retikz/layout/compose';

import { LegendContentKind } from '../constants';
import { LegendItemsContentSchema, LegendRampContentSchema, LegendSchema } from '../schema';
import type { IRLegend } from '../types';
import type { CanonicalLegend } from './types';

/** 在布局前确定 Legend 默认值并展开物理间距 */
export const resolveLegend = (source: IRLegend): CanonicalLegend => {
  const content = source.content;
  return {
    ...source,
    ...resolveLayoutContainerBox(source),
    titleGap: source.titleGap ?? LegendSchema.shape.titleGap.parse(undefined),
    contentAlign: source.contentAlign ?? LegendSchema.shape.contentAlign.parse(undefined),
    content:
      content.kind === LegendContentKind.Items
        ? {
            ...content,
            direction: content.direction ?? LegendItemsContentSchema.shape.direction.parse(undefined),
            wrap: content.wrap ?? LegendItemsContentSchema.shape.wrap.parse(undefined),
            sampleGap: content.sampleGap ?? LegendItemsContentSchema.shape.sampleGap.parse(undefined),
            sampleAlign: content.sampleAlign ?? LegendItemsContentSchema.shape.sampleAlign.parse(undefined),
            gap: (() => {
              const gap = content.gap ?? LegendItemsContentSchema.shape.gap.parse(undefined);
              return typeof gap === 'number' ? { row: gap, column: gap } : gap;
            })(),
          }
        : {
            ...content,
            direction: content.direction ?? LegendRampContentSchema.shape.direction.parse(undefined),
            sampleGap: content.sampleGap ?? LegendRampContentSchema.shape.sampleGap.parse(undefined),
          },
  };
};

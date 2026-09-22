import { resolveLayoutContainerBox } from '@retikz/layout/compose';

import { LegendContentKind } from '../constants';
import { LegendSchema } from '../schema';
import type { IRLegend } from '../types';
import type { CanonicalLegend } from './types';

/** 在布局前确定 Legend 默认值并展开物理间距 */
export const resolveLegend = (source: IRLegend): CanonicalLegend => {
  const content = LegendSchema.shape.content.parse(source.content);
  return {
    ...source,
    ...resolveLayoutContainerBox(source),
    titleGap: source.titleGap ?? LegendSchema.shape.titleGap.parse(undefined),
    contentAlign: source.contentAlign ?? LegendSchema.shape.contentAlign.parse(undefined),
    content:
      content.kind === LegendContentKind.Items
        ? { ...content, gap: typeof content.gap === 'number' ? { row: content.gap, column: content.gap } : content.gap }
        : content,
  };
};

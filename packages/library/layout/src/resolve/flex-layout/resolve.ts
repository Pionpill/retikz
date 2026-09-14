import { resolveBoxSpacing } from '@retikz/core';

import type { IRFlexLayout } from '../../composites/flex-layout/schemas';
import type { CanonicalFlexLayout } from './types';

import { FlexLayoutItemSchema, FlexLayoutSchema } from '../../composites/flex-layout/schemas';
import { resolveLayoutContainerBox } from '../shared';

/** 在测量前确定 Flex 的容器及子项配置 */
export const resolveFlexLayout = (source: IRFlexLayout): CanonicalFlexLayout => {
  const gap = source.gap ?? FlexLayoutSchema.shape.gap.parse(undefined);
  return {
    ...source,
    ...resolveLayoutContainerBox(source),
    direction: source.direction ?? FlexLayoutSchema.shape.direction.parse(undefined),
    wrap: source.wrap ?? FlexLayoutSchema.shape.wrap.parse(undefined),
    gap: typeof gap === 'number' ? { column: gap, row: gap } : gap,
    justifyContent: source.justifyContent ?? FlexLayoutSchema.shape.justifyContent.parse(undefined),
    alignItems: source.alignItems ?? FlexLayoutSchema.shape.alignItems.parse(undefined),
    alignContent: source.alignContent ?? FlexLayoutSchema.shape.alignContent.parse(undefined),
    children: (source.children ?? FlexLayoutSchema.shape.children.parse(undefined)).map(item => ({
      ...item,
      margin: resolveBoxSpacing(item.margin, 0),
      basis: item.basis ?? FlexLayoutItemSchema.shape.basis.parse(undefined),
      grow: item.grow ?? FlexLayoutItemSchema.shape.grow.parse(undefined),
      shrink: item.shrink ?? FlexLayoutItemSchema.shape.shrink.parse(undefined),
    })),
  };
};

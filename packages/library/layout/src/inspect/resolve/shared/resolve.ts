import type { BaseLayoutInspectOptions } from '../../shared/types';
import type { CanonicalBaseLayoutInspectOptions } from './types';

import {
  BaseLayoutInspectOptionsSchema,
  LayoutInspectBoundsOptionsSchema,
  LayoutInspectSpacingOptionsSchema,
} from '../../shared';

const defaultOptions = BaseLayoutInspectOptionsSchema.parse({});
const defaultBounds = LayoutInspectBoundsOptionsSchema.parse({});
const defaultSpacing = LayoutInspectSpacingOptionsSchema.parse({});

/** 解析共享观测开关；对象中的 undefined 不覆盖默认 */
export const resolveBaseLayoutInspectOptions = (
  options: BaseLayoutInspectOptions,
): CanonicalBaseLayoutInspectOptions => {
  const bounds = options.bounds;
  const spacing = options.spacing;
  return {
    bounds: {
      container: typeof bounds === 'boolean' ? bounds : (bounds?.container ?? defaultBounds.container),
      content: typeof bounds === 'boolean' ? bounds : (bounds?.content ?? defaultBounds.content),
      slot: typeof bounds === 'boolean' ? bounds : (bounds?.slot ?? defaultBounds.slot),
      allocation: typeof bounds === 'boolean' ? bounds : (bounds?.allocation ?? defaultBounds.allocation),
      visual: typeof bounds === 'boolean' ? defaultBounds.visual : (bounds?.visual ?? defaultBounds.visual),
    },
    spacing: {
      padding: typeof spacing === 'boolean' ? spacing : (spacing?.padding ?? defaultSpacing.padding),
      margin: typeof spacing === 'boolean' ? spacing : (spacing?.margin ?? defaultSpacing.margin),
    },
    overflow: options.overflow ?? defaultOptions.overflow,
    alignmentGuides: options.alignmentGuides ?? defaultOptions.alignmentGuides,
    labels: options.labels ?? defaultOptions.labels,
  };
};

/** Layout 选项按已提供字段浅合并，不解释默认或深层结构 */
const mergeDefinedOptions = <T extends object>(inherited: T, local: T): T => {
  const merged = { ...inherited };
  for (const key in local) {
    if (local[key] !== undefined) merged[key] = local[key];
  }
  return merged;
};

/** 合并共享与布局专属字段；只有两个对象简写才逐字段合并 */
export const mergeLayoutInspectOptionsInput = <T extends BaseLayoutInspectOptions>(inherited: T, local: T): T => {
  const merged = mergeDefinedOptions(inherited, local);
  if (typeof inherited.bounds === 'object' && typeof local.bounds === 'object') {
    merged.bounds = mergeDefinedOptions(inherited.bounds, local.bounds);
  }
  if (typeof inherited.spacing === 'object' && typeof local.spacing === 'object') {
    merged.spacing = mergeDefinedOptions(inherited.spacing, local.spacing);
  }
  return merged;
};

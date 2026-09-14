import { mergeProperties } from '@retikz/foundation';

import {
  BaseLayoutInspectOptionsSchema,
  LayoutInspectBoundsOptionsSchema,
  LayoutInspectSpacingOptionsSchema,
} from '../../shared';
import type { BaseLayoutInspectOptions } from '../../shared/types';
import type { CanonicalBaseLayoutInspectOptions } from './types';

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

/** 合并共享与布局专属字段；只有两个对象简写才逐字段合并 */
export const mergeLayoutInspectOptionsInput = <T extends BaseLayoutInspectOptions>(inherited: T, local: T): T => {
  const merged = { ...inherited, ...mergeProperties([local], { shouldOverride: value => value !== undefined }) };
  if (typeof inherited.bounds === 'object' && typeof local.bounds === 'object') {
    merged.bounds = {
      ...inherited.bounds,
      ...mergeProperties([local.bounds], { shouldOverride: value => value !== undefined }),
    };
  }
  if (typeof inherited.spacing === 'object' && typeof local.spacing === 'object') {
    merged.spacing = {
      ...inherited.spacing,
      ...mergeProperties([local.spacing], { shouldOverride: value => value !== undefined }),
    };
  }
  return merged;
};

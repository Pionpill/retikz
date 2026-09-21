import { mergeProperties } from '@retikz/foundation';

import type { IRScopeFrame, IRPaintValue } from '../../schemas';
import { ScopeFrameSchema, ScopeFrameStyleSchema } from '../../schemas';
import { resolvePaint } from '../resource';
import type { PaintResolveContext } from '../resource';
import { resolveContextualColor } from './contextual-color';
import type { ContextualColorResolveContext } from './contextual-color';
import { resolveDropShadow } from './drawable';
import type { StyleResolveFrame } from './types';

/** 仅共享有效颜色上下文，解析独立外框外观 */
export const resolveScopeFrame = (
  frame: IRScopeFrame,
  stack: ReadonlyArray<StyleResolveFrame>,
  context: PaintResolveContext & Pick<ContextualColorResolveContext, 'mode'>,
) => {
  let masterColor: string | undefined;
  for (const entry of stack) {
    if (entry.cascade.color !== undefined) masterColor = entry.cascade.color;
  }
  masterColor = frame.style?.color ?? masterColor;
  const defaults = ScopeFrameStyleSchema.parse({});
  const style = {
    ...defaults,
    ...mergeProperties([frame.style ?? {}], { shouldOverride: value => value !== undefined }),
  };
  const paint = (value: IRPaintValue, field: string) =>
    resolvePaint(
      typeof value === 'object'
        ? value
        : value === 'currentColor' && masterColor !== undefined
          ? masterColor
          : resolveContextualColor(value, {
              masterColor,
              mode: context.mode,
              fieldPath: `${context.irPath}.style.${field}`,
            }),
      context,
    );
  return {
    padding: frame.padding ?? ScopeFrameSchema.shape.padding.parse(undefined),
    fill: paint(style.fill, 'fill'),
    stroke: paint(style.stroke, 'stroke'),
    strokeWidth: style.strokeWidth,
    opacity: style.opacity,
    fillOpacity: style.fillOpacity,
    strokeOpacity: style.strokeOpacity,
    shadow: resolveDropShadow(style.shadow),
    blendMode: style.blendMode,
  };
};

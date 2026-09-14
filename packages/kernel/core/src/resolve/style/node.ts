import { mergeProperties } from '@retikz/foundation';

import type { IRNode, IRNodeDefault, IRNodeLayout, IRNodeStyle } from '../../schemas';
import { cutsStyleChannel } from './frame';
import type { StyleResolveFrame } from './types';

/** 按各字段的原有覆盖粒度解析节点分组，复合叶子保持整体覆盖 */
export const resolveEffectiveNodeStyle = (node: IRNode, stack: ReadonlyArray<StyleResolveFrame>): IRNode => {
  let defaults: IRNodeDefault = {};
  let style: IRNodeStyle = {};
  let layout: IRNodeLayout = {};
  for (const frame of stack) {
    if (cutsStyleChannel(frame.resetStyle, 'node')) {
      defaults = {};
      style = {};
      layout = {};
    }
    const { style: nodeStyle, layout: nodeLayout, ...geometry } = frame.nodeDefault ?? {};
    defaults = { ...defaults, ...mergeProperties([geometry], { shouldOverride: value => value !== undefined }) };
    style = {
      ...style,
      ...mergeProperties<IRNodeStyle>([frame.cascade, nodeStyle], { shouldOverride: value => value !== undefined }),
    };
    layout = { ...layout, ...mergeProperties([nodeLayout ?? {}], { shouldOverride: value => value !== undefined }) };
  }
  style = { ...style, ...mergeProperties([node.style ?? {}], { shouldOverride: value => value !== undefined }) };
  layout = { ...layout, ...mergeProperties([node.layout ?? {}], { shouldOverride: value => value !== undefined }) };
  if (style.color !== undefined) {
    style.stroke ??= style.color;
    style.fill ??= style.color;
    style.textColor ??= style.color;
  }
  return {
    ...defaults,
    ...mergeProperties([node], { shouldOverride: value => value !== undefined }),
    type: node.type,
    position: node.position,
    style,
    layout,
  };
};

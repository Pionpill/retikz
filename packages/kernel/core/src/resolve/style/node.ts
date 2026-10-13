import { mergeProperties } from '@retikz/foundation';

import type { IRNode, IRNodeStyle } from '../../schemas';
import { mergeGraphicStyle } from './opacity';
import type { EffectiveScopeDefaults } from './types';

/** 按各字段的原有覆盖粒度解析节点分组，复合叶子保持整体覆盖 */
export const resolveEffectiveNodeStyle = (node: IRNode, scopeDefaults: EffectiveScopeDefaults): IRNode => {
  const defaults = scopeDefaults.node;
  const style = mergeGraphicStyle<IRNodeStyle>(defaults?.style, node.style);
  const layout = {
    ...defaults?.layout,
    ...mergeProperties([node.layout ?? {}], { shouldOverride: value => value !== undefined }),
  };
  if (style.color !== undefined) {
    style.stroke ??= style.color;
    style.fill ??= style.color;
    style.textColor ??= style.color;
  }

  return {
    ...defaults?.geometry,
    ...mergeProperties([node], { shouldOverride: value => value !== undefined }),
    type: node.type,
    position: node.position,
    style,
    layout,
  };
};

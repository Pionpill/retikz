import { mergeDefinedProperties } from '@retikz/foundation';

import type { IRNode, IRNodeStyle } from '../../schemas';
import { mergeFont } from './font';
import { mergeGraphicStyle } from './opacity';
import type { MergedScopeDefaults } from './types';

/** 将作用域默认值与节点自身配置合并，并用主色补齐缺省的填充、描边和文字色 */
export const mergeNodeStyle = (node: IRNode, scopeDefaults: MergedScopeDefaults): IRNode => {
  const defaults = scopeDefaults.node;
  const style = mergeGraphicStyle<IRNodeStyle>(defaults?.style, node.style);
  const font = mergeFont(defaults?.style.font, node.style?.font);
  if (font !== undefined) style.font = font;
  const layout = mergeDefinedProperties([defaults?.layout, node.layout]);
  if (style.color !== undefined) {
    style.stroke ??= style.color;
    style.fill ??= style.color;
    style.textColor ??= style.color;
  }

  return {
    ...mergeDefinedProperties([defaults?.geometry, node]),
    type: node.type,
    position: node.position,
    style,
    layout,
  };
};

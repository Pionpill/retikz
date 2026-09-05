import type { IRNode, IRNodeDefault, IRNodeLayout, IRNodeStyle } from '../../schemas';
import type { StyleResolveFrame } from './types';

import { cutsStyleChannel, pickDefinedKeys } from './frame';

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
    defaults = { ...defaults, ...pickDefinedKeys(geometry) };
    style = { ...style, ...pickDefinedKeys(frame.cascade), ...pickDefinedKeys(nodeStyle ?? {}) };
    layout = { ...layout, ...pickDefinedKeys(nodeLayout ?? {}) };
  }
  style = { ...style, ...pickDefinedKeys(node.style ?? {}) };
  layout = { ...layout, ...pickDefinedKeys(node.layout ?? {}) };
  if (style.color !== undefined) {
    style.stroke ??= style.color;
    style.fill ??= style.color;
    style.textColor ??= style.color;
  }
  return { ...defaults, ...pickDefinedKeys(node), type: node.type, position: node.position, style, layout };
};

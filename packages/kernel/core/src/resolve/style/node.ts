import type { IRNode } from '../../schemas';
import type { CascadeState, StyleResolveFrame } from './types';

import { cutsStyleChannel, pickDefinedKeys } from './frame';

/** 级联 graphic state 投影到 node 样式字段 */
const cascadeToNode = (c: CascadeState): Partial<IRNode> => {
  const out: Partial<IRNode> = {};
  if (c.color !== undefined) out.color = c.color;
  if (c.stroke !== undefined) out.stroke = c.stroke;
  if (c.fill !== undefined) out.fill = c.fill;
  if (c.strokeWidth !== undefined) out.strokeWidth = c.strokeWidth;
  if (c.opacity !== undefined) out.opacity = c.opacity;
  if (c.fillOpacity !== undefined) out.fillOpacity = c.fillOpacity;
  if (c.strokeOpacity !== undefined) out.strokeOpacity = c.strokeOpacity;
  return out;
};

/** 解析 node 的最终样式 */
export const resolveEffectiveNodeStyle = (node: IRNode, stack: ReadonlyArray<StyleResolveFrame>): IRNode => {
  let acc: Partial<IRNode> = {};
  for (const frame of stack) {
    if (cutsStyleChannel(frame.resetStyle, 'node')) acc = {};
    acc = { ...acc, ...pickDefinedKeys(cascadeToNode(frame.cascade)) };
    if (frame.nodeDefault) {
      acc = { ...acc, ...pickDefinedKeys(frame.nodeDefault) };
    }
  }
  acc = { ...acc, ...pickDefinedKeys(node) };
  const master = acc.color;
  if (master !== undefined) {
    if (acc.stroke === undefined) acc.stroke = master;
    if (acc.fill === undefined) acc.fill = master;
    if (acc.textColor === undefined) acc.textColor = master;
  }
  return acc as IRNode;
};

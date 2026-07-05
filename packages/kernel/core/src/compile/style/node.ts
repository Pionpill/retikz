import type { IRNode } from '../../schemas';
import type { CascadeState, StyleFrame } from './frame';

import { cuts, pickDefinedKeys } from './frame';

/** 级联 graphic state 投影到 node 样式字段。 */
const cascadeToNode = (c: CascadeState): Partial<IRNode> => {
  const out: Partial<IRNode> = {};
  const master = c.color;
  const stroke = c.stroke ?? master;
  if (stroke !== undefined) out.stroke = stroke;
  const fill = c.fill ?? master;
  if (fill !== undefined) out.fill = fill;
  if (master !== undefined) out.textColor = master;
  if (c.strokeWidth !== undefined) out.strokeWidth = c.strokeWidth;
  if (c.opacity !== undefined) out.opacity = c.opacity;
  if (c.fillOpacity !== undefined) out.fillOpacity = c.fillOpacity;
  if (c.drawOpacity !== undefined) out.drawOpacity = c.drawOpacity;
  return out;
};

/** node 源同源主色展开。 */
const expandNodeColor = (src: Partial<IRNode>): Partial<IRNode> => {
  const out: Partial<IRNode> = { ...src };
  const master = src.color;
  if (master !== undefined) {
    if (out.stroke === undefined) out.stroke = master;
    if (out.fill === undefined) out.fill = master;
    if (out.textColor === undefined) out.textColor = master;
  }
  return out;
};

/** 解析 node 的最终样式。 */
export const resolveNodeStyle = (node: IRNode, stack: ReadonlyArray<StyleFrame>): IRNode => {
  let acc: Partial<IRNode> = {};
  for (const frame of stack) {
    if (cuts(frame.resetStyle, 'node')) acc = {};
    acc = { ...acc, ...pickDefinedKeys(cascadeToNode(frame.cascade)) };
    if (frame.nodeDefault) {
      acc = { ...acc, ...pickDefinedKeys(expandNodeColor(frame.nodeDefault)) };
    }
  }
  acc = { ...acc, ...pickDefinedKeys(expandNodeColor(node)) };
  return acc as IRNode;
};

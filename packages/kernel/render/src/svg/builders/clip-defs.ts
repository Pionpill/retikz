import type { ClipShape, SceneResource } from '@retikz/core';

import type { SvgNode } from '../types';

import { buildPathD } from '../path-d-builder';

const fillRuleAttrs = (fillRule: 'nonzero' | 'evenodd' | undefined): SvgNode['attrs'] =>
  fillRule === undefined ? {} : { 'clip-rule': fillRule };

const buildClipShape = (shape: ClipShape): SvgNode => {
  switch (shape.kind) {
    case 'rect':
      return {
        tag: 'rect',
        attrs: { x: shape.x, y: shape.y, width: shape.width, height: shape.height },
      };
    case 'circle':
      return { tag: 'circle', attrs: { cx: shape.cx, cy: shape.cy, r: shape.r } };
    case 'ellipse':
      return { tag: 'ellipse', attrs: { cx: shape.cx, cy: shape.cy, rx: shape.rx, ry: shape.ry } };
    case 'polygon':
      return { tag: 'polygon', attrs: { points: shape.points.map(([x, y]) => `${x},${y}`).join(' ') } };
    case 'path':
      return { tag: 'path', attrs: { d: buildPathD(shape.commands), ...fillRuleAttrs(shape.fillRule) } };
    case 'compound':
      return {
        tag: 'g',
        attrs: fillRuleAttrs(shape.fillRule),
        children: shape.children.map(buildClipShape),
      };
  }
};

type ClipResource = Extract<SceneResource, { kind: 'clip' }>;

/** 把 clip Scene resource 构建为带指定 id 的 SVG clipPath 描述节点 */
export const buildClipDef = (resource: ClipResource, id: string): SvgNode => ({
  tag: 'clipPath',
  attrs: { id },
  children: [buildClipShape(resource.shape)],
});

import type { ClipShape, PathCommand, SceneResource } from '@retikz/core';

import type { SvgNode } from '../types';

import { buildPathD } from '../path-d-builder';

const fillRuleAttrs = (fillRule: 'nonzero' | 'evenodd' | undefined): SvgNode['attrs'] =>
  fillRule === undefined ? {} : { 'clip-rule': fillRule };

/** 把 clip shape 追加为同一个 SVG path 的子路径，使 compound 与 Canvas 共用累积填充语义 */
const appendClipPathCommands = (shape: ClipShape, commands: Array<PathCommand>): void => {
  switch (shape.kind) {
    case 'rect':
      commands.push(
        { kind: 'move', to: [shape.x, shape.y] },
        { kind: 'line', to: [shape.x + shape.width, shape.y] },
        { kind: 'line', to: [shape.x + shape.width, shape.y + shape.height] },
        { kind: 'line', to: [shape.x, shape.y + shape.height] },
        { kind: 'close' },
      );
      break;
    case 'circle':
      commands.push(
        { kind: 'move', to: [shape.cx + shape.r, shape.cy] },
        { kind: 'arc', center: [shape.cx, shape.cy], radius: shape.r, startAngle: 0, endAngle: 360 },
        { kind: 'close' },
      );
      break;
    case 'ellipse':
      commands.push(
        { kind: 'move', to: [shape.cx + shape.rx, shape.cy] },
        {
          kind: 'ellipseArc',
          center: [shape.cx, shape.cy],
          radiusX: shape.rx,
          radiusY: shape.ry,
          startAngle: 0,
          endAngle: 360,
        },
        { kind: 'close' },
      );
      break;
    case 'polygon': {
      const first = shape.points[0];
      commands.push({ kind: 'move', to: first });
      for (const point of shape.points.slice(1)) commands.push({ kind: 'line', to: point });
      commands.push({ kind: 'close' });
      break;
    }
    case 'path':
      commands.push(...shape.commands);
      break;
    case 'compound':
      for (const child of shape.children) appendClipPathCommands(child, commands);
      break;
  }
};

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
    case 'compound': {
      const commands: Array<PathCommand> = [];
      appendClipPathCommands(shape, commands);
      return {
        tag: 'path',
        attrs: { d: buildPathD(commands), ...fillRuleAttrs(shape.fillRule) },
      };
    }
  }
};

type ClipResource = Extract<SceneResource, { kind: 'clip' }>;

/** 把 clip Scene resource 构建为带指定 id 的 SVG clipPath 描述节点 */
export const buildClipDef = (resource: ClipResource, id: string): SvgNode => ({
  tag: 'clipPath',
  attrs: { id },
  children: [buildClipShape(resource.shape)],
});

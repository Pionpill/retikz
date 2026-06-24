import type { ClipShape, SceneResource } from '@retikz/core';
import type { SvgNode } from '../types';

/** 一个裁剪区几何 → `<clipPath>` 内的形状子 SvgNode */
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
  }
};

/** 类型守卫：clip 资源 */
type ClipResource = Extract<SceneResource, { kind: 'clip' }>;

/**
 * 一个 clip 资源 → `<clipPath>` SvgNode
 * @description `id` 已由 caller 加实例前缀；`GroupPrim.clipRef` 经同 id 的 `url(#...)` 引用。内含
 *   rect / circle / ellipse / polygon 形状子节点。
 */
export const buildClipDef = (resource: ClipResource, id: string): SvgNode => ({
  tag: 'clipPath',
  attrs: { id },
  children: [buildClipShape(resource.shape)],
});

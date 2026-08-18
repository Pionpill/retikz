import type { SceneResource } from '@retikz/core';

import type { SvgNode } from '../types';

import { buildPathD } from '../path-d-builder';

type ClipResource = Extract<SceneResource, { kind: 'clip' }>;

/** 把 clip Scene resource 构建为带指定 id 的 SVG clipPath 描述节点 */
export const buildClipDef = (resource: ClipResource, id: string): SvgNode => ({
  tag: 'clipPath',
  attrs: { id },
  children: [
    {
      tag: 'path',
      attrs: { d: buildPathD(resource.path.commands), 'clip-rule': resource.path.fillRule },
    },
  ],
});

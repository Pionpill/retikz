import type { ClipDefinition, ClipResolveContext, ClipShape } from '@retikz/core';

import { defineClip } from '@retikz/core';

import type { CompoundClipSpec, StandardPathClipSpec, StandardPolygonClipSpec } from './schema';
import { PathClipSchema, PolygonClipSchema } from './schema';

import { CompoundClipSchema } from './schema';

/** 判断开放 clip 规格是否为递归 Compound Clip */
const isCompoundClipSpec = (clip: CompoundClipSpec['children'][number]): clip is CompoundClipSpec =>
  clip.kind === 'compound' && 'children' in clip;

/** 递归解析 Compound Clip 与其已注册的子 clip */
const resolveCompoundClip = (spec: CompoundClipSpec, context: ClipResolveContext): ClipShape => ({
  kind: 'compound',
  children: spec.children.map(child =>
    isCompoundClipSpec(child) ? resolveCompoundClip(child, context) : context.resolve(child),
  ),
  fillRule: spec.fillRule,
});

/** Standard 提供的 Compound Clip Definition */
export const CompoundClipDefinition: ClipDefinition = defineClip({
  kind: 'compound',
  schema: CompoundClipSchema,
  resolve: resolveCompoundClip,
});

/** Standard 提供的多边形裁剪 Definition */
export const PolygonClipDefinition: ClipDefinition = defineClip<StandardPolygonClipSpec>({
  kind: 'polygon',
  schema: PolygonClipSchema,
  resolve: spec => ({ kind: 'polygon', points: spec.points }),
});

/** Standard 提供的路径裁剪 Definition */
export const PathClipDefinition: ClipDefinition = defineClip<StandardPathClipSpec>({
  kind: 'path',
  schema: PathClipSchema,
  resolve: spec => ({ kind: 'path', commands: spec.commands, fillRule: spec.fillRule }),
});

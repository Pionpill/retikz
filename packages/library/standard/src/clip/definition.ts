import type { ClipDefinition, ClipResolveContext, ClipShape } from '@retikz/core';

import { defineClip } from '@retikz/core';

import type { CompoundClip, StandardPathClip, StandardPolygonClip } from './schema';

import { PathClipSchema, PolygonClipSchema } from './schema';
import { CompoundClipSchema } from './schema';

/** 判断开放 clip 规格是否为递归 Compound Clip */
const isCompoundClip = (clip: CompoundClip['children'][number]): clip is CompoundClip =>
  clip.kind === 'compound' && 'children' in clip;

/** 递归解析 Compound Clip 与其已注册的子 clip */
const resolveCompoundClip = (spec: CompoundClip, context: ClipResolveContext): ClipShape => ({
  kind: 'compound',
  children: spec.children.map(child =>
    isCompoundClip(child) ? resolveCompoundClip(child, context) : context.resolve(child),
  ),
  ...(spec.fillRule === undefined ? {} : { fillRule: spec.fillRule }),
});

/** Standard 提供的 Compound Clip Definition */
export const CompoundClipDefinition: ClipDefinition = defineClip({
  kind: 'compound',
  schema: CompoundClipSchema,
  resolve: resolveCompoundClip,
});

/** Standard 提供的多边形裁剪 Definition */
export const PolygonClipDefinition: ClipDefinition = defineClip<StandardPolygonClip>({
  kind: 'polygon',
  schema: PolygonClipSchema,
  resolve: spec => ({ kind: 'polygon', points: spec.points }),
});

/** Standard 提供的路径裁剪 Definition */
export const PathClipDefinition: ClipDefinition = defineClip<StandardPathClip>({
  kind: 'path',
  schema: PathClipSchema,
  resolve: spec => ({
    kind: 'path',
    commands: spec.commands,
    ...(spec.fillRule === undefined ? {} : { fillRule: spec.fillRule }),
  }),
});

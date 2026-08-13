import type { ClipDefinition, ClipResolveContext, ClipShape } from '@retikz/core';

import { defineClip } from '@retikz/core';

import type { CompoundClipSpec } from './schema';

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

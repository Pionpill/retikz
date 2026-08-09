import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { CalloutArtifact, IRCallout } from './types';

import { NOTATION_NAMESPACE } from '../shared';
import { compileCallout } from './compile';
import { CalloutArtifactSchema, CalloutSchema } from './schema';

/** Notation Callout 的布局感知复合元素定义 */
export const CalloutDefinition: LayoutCompositeDefinition<
  IRCallout,
  typeof NOTATION_NAMESPACE,
  'callout',
  CalloutArtifact
> = defineComposite({
  namespace: NOTATION_NAMESPACE,
  type: 'callout',
  schema: CalloutSchema,
  compile: compileCallout,
  artifactSchema: CalloutArtifactSchema,
});

/** 由 Callout 定义推导的编译产物封装 */
export type CalloutCompileArtifact = CompositeArtifactOf<typeof CalloutDefinition>;

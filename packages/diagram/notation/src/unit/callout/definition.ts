import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { CalloutArtifact, IRCallout } from './types';

import { NOTATION_NAMESPACE } from '../shared';
import { compileCallout } from './compile';
import { CalloutArtifactSchema, CalloutSchema } from './schema';

/** Notation Callout 布局感知复合组件定义 */
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

/** Callout definition 推导出的 compile artifact envelope */
export type CalloutCompileArtifact = CompositeArtifactOf<typeof CalloutDefinition>;

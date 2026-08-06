import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite, defineInspector } from '@retikz/core';

import type { FlexLayoutArtifact, IRFlexLayout, ResolvedFlexLayoutInspectOptions } from './types';

import { STANDARD_NAMESPACE } from '../../shared';
import { inspectFlexLayoutArtifact } from './inspection';
import { compileFlexLayout } from './pipeline';
import {
  FlexLayoutArtifactSchema,
  FlexLayoutInspectOptionsInputSchema,
  FlexLayoutInspectOptionsSchema,
  FlexLayoutSchema,
} from './schema';

/** Standard FlexLayout 的官方 Core layout-aware composite definition */
export const FlexLayoutDefinition: LayoutCompositeDefinition<
  IRFlexLayout,
  typeof STANDARD_NAMESPACE,
  'flexLayout',
  FlexLayoutArtifact,
  typeof FlexLayoutInspectOptionsInputSchema.shape,
  ResolvedFlexLayoutInspectOptions
> = defineComposite({
  namespace: STANDARD_NAMESPACE,
  type: 'flexLayout',
  schema: FlexLayoutSchema,
  compile: compileFlexLayout,
  artifactSchema: FlexLayoutArtifactSchema,
  inspector: defineInspector({
    kind: 'composite',
    optionsInputSchema: FlexLayoutInspectOptionsInputSchema,
    optionsSchema: FlexLayoutInspectOptionsSchema,
    inspect: inspectFlexLayoutArtifact,
  }),
});

/** FlexLayout definition 推导出的公开 compile artifact envelope */
export type FlexLayoutCompileArtifact = CompositeArtifactOf<typeof FlexLayoutDefinition>;

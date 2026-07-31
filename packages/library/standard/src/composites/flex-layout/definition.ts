import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { ResolvedFlexLayoutInspectLocalOptions } from '../shared/layout';
import type { FlexLayoutArtifact } from './artifact-types';
import type { IRFlexLayout } from './types';

import { FlexLayoutInspectLocalOptionsInputSchema, FlexLayoutInspectLocalOptionsSchema } from '../shared/layout';
import { FlexLayoutArtifactSchema } from './artifact-schema';
import { compileFlexLayout } from './compile';
import { inspectFlexLayoutArtifact } from './inspection';
import { FlexLayoutSchema } from './schema';

/** Standard FlexLayout 的官方 Core layout-aware composite definition */
export const FlexLayoutDefinition: LayoutCompositeDefinition<
  IRFlexLayout,
  'standard',
  'flexLayout',
  FlexLayoutArtifact,
  typeof FlexLayoutInspectLocalOptionsInputSchema.shape,
  ResolvedFlexLayoutInspectLocalOptions
> = defineComposite({
  namespace: 'standard',
  type: 'flexLayout',
  schema: FlexLayoutSchema,
  compile: compileFlexLayout,
  artifactSchema: FlexLayoutArtifactSchema,
  inspector: {
    kind: 'layout',
    localOptionsInputSchema: FlexLayoutInspectLocalOptionsInputSchema,
    localOptionsSchema: FlexLayoutInspectLocalOptionsSchema,
    inspect: inspectFlexLayoutArtifact,
  },
});

/** FlexLayout definition 推导出的公开 compile artifact envelope */
export type FlexLayoutCompileArtifact = CompositeArtifactOf<typeof FlexLayoutDefinition>;

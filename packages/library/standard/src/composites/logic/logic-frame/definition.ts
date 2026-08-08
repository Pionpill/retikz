import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { IRLogicFrame, LogicFrameArtifact } from './types';

import { STANDARD_NAMESPACE } from '../../shared';
import { compileLogicFrame } from './compile';
import { LogicFrameArtifactSchema, LogicFrameSchema } from './schema';

/** Standard LogicFrame layout-aware composite definition */
export const LogicFrameDefinition: LayoutCompositeDefinition<
  IRLogicFrame,
  typeof STANDARD_NAMESPACE,
  'logicFrame',
  LogicFrameArtifact
> = defineComposite({
  namespace: STANDARD_NAMESPACE,
  type: 'logicFrame',
  schema: LogicFrameSchema,
  compile: compileLogicFrame,
  artifactSchema: LogicFrameArtifactSchema,
});

/** LogicFrame definition-derived compile artifact envelope */
export type LogicFrameCompileArtifact = CompositeArtifactOf<typeof LogicFrameDefinition>;

import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { IRLogicFrame, LogicFrameArtifact } from './types';

import { NOTATION_NAMESPACE } from '../shared';
import { compileLogicFrame } from './compile';
import { LogicFrameArtifactSchema, LogicFrameSchema } from './schema';

/** Notation LogicFrame layout-aware composite definition */
export const LogicFrameDefinition: LayoutCompositeDefinition<
  IRLogicFrame,
  typeof NOTATION_NAMESPACE,
  'logicFrame',
  LogicFrameArtifact
> = defineComposite({
  namespace: NOTATION_NAMESPACE,
  type: 'logicFrame',
  schema: LogicFrameSchema,
  compile: compileLogicFrame,
  artifactSchema: LogicFrameArtifactSchema,
});

/** LogicFrame definition-derived compile artifact envelope */
export type LogicFrameCompileArtifact = CompositeArtifactOf<typeof LogicFrameDefinition>;

import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { IRLogicBlockBase, LogicBlockBaseArtifact } from './types';

import { STANDARD_NAMESPACE } from '../../shared';
import { compileLogicBlockBase } from './compile';
import { LogicBlockBaseArtifactSchema, LogicBlockBaseSchema } from './schema';

/** Standard LogicBlockBase layout-aware composite definition */
export const LogicBlockBaseDefinition: LayoutCompositeDefinition<
  IRLogicBlockBase,
  typeof STANDARD_NAMESPACE,
  'logicBlockBase',
  LogicBlockBaseArtifact
> = defineComposite({
  namespace: STANDARD_NAMESPACE,
  type: 'logicBlockBase',
  schema: LogicBlockBaseSchema,
  compile: compileLogicBlockBase,
  artifactSchema: LogicBlockBaseArtifactSchema,
});

/** LogicBlockBase definition-derived compile artifact envelope */
export type LogicBlockBaseCompileArtifact = CompositeArtifactOf<typeof LogicBlockBaseDefinition>;

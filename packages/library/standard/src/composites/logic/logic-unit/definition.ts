import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type {
  DecisionArtifact,
  IRDecision,
  IRJunction,
  IRStage,
  IRTerminal,
  JunctionArtifact,
  StageArtifact,
  TerminalArtifact,
} from './types';

import { STANDARD_NAMESPACE } from '../../shared';
import { compileDecision, compileJunction, compileStage, compileTerminal } from './compile';
import {
  DecisionArtifactSchema,
  DecisionSchema,
  JunctionArtifactSchema,
  JunctionSchema,
  StageArtifactSchema,
  StageSchema,
  TerminalArtifactSchema,
  TerminalSchema,
} from './schema';

/** Standard Terminal 布局感知复合组件定义 */
export const TerminalDefinition: LayoutCompositeDefinition<
  IRTerminal,
  typeof STANDARD_NAMESPACE,
  'terminal',
  TerminalArtifact
> = defineComposite({
  namespace: STANDARD_NAMESPACE,
  type: 'terminal',
  schema: TerminalSchema,
  compile: compileTerminal,
  artifactSchema: TerminalArtifactSchema,
});

/** Standard Stage 布局感知复合组件定义 */
export const StageDefinition: LayoutCompositeDefinition<IRStage, typeof STANDARD_NAMESPACE, 'stage', StageArtifact> =
  defineComposite({
    namespace: STANDARD_NAMESPACE,
    type: 'stage',
    schema: StageSchema,
    compile: compileStage,
    artifactSchema: StageArtifactSchema,
  });

/** Standard Decision 布局感知复合组件定义 */
export const DecisionDefinition: LayoutCompositeDefinition<
  IRDecision,
  typeof STANDARD_NAMESPACE,
  'decision',
  DecisionArtifact
> = defineComposite({
  namespace: STANDARD_NAMESPACE,
  type: 'decision',
  schema: DecisionSchema,
  compile: compileDecision,
  artifactSchema: DecisionArtifactSchema,
});

/** Standard Junction 布局感知复合组件定义 */
export const JunctionDefinition: LayoutCompositeDefinition<
  IRJunction,
  typeof STANDARD_NAMESPACE,
  'junction',
  JunctionArtifact
> = defineComposite({
  namespace: STANDARD_NAMESPACE,
  type: 'junction',
  schema: JunctionSchema,
  compile: compileJunction,
  artifactSchema: JunctionArtifactSchema,
});

/** Terminal definition 推导出的 composite artifact envelope */
export type TerminalCompileArtifact = CompositeArtifactOf<typeof TerminalDefinition>;

/** Stage definition 推导出的 composite artifact envelope */
export type StageCompileArtifact = CompositeArtifactOf<typeof StageDefinition>;

/** Decision definition 推导出的 composite artifact envelope */
export type DecisionCompileArtifact = CompositeArtifactOf<typeof DecisionDefinition>;

/** Junction definition 推导出的 composite artifact envelope */
export type JunctionCompileArtifact = CompositeArtifactOf<typeof JunctionDefinition>;

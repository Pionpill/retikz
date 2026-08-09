import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { IRLogicFrame, LogicFrameArtifact } from './types';

import { NOTATION_NAMESPACE } from '../../shared';
import { compileLogicFrame } from './compile';
import { LogicFrameArtifactSchema, LogicFrameSchema } from './schema';

/** Notation LogicFrame 的布局感知复合元素定义 */
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

/** 由 LogicFrame 定义推导的编译产物封装 */
export type LogicFrameCompileArtifact = CompositeArtifactOf<typeof LogicFrameDefinition>;

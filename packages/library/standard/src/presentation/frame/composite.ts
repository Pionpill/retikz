import type { LayoutCompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';

import { STANDARD_NAMESPACE } from '../../shared';
import { compileFrame } from './pipeline';
import { FrameSchema } from './schema';
import type { IRFrame, FrameInput } from './types';

/** Standard Frame 的官方 Core composite definition */
export const FrameDefinition: LayoutCompositeDefinition<IRFrame, typeof STANDARD_NAMESPACE, 'frame'> = defineComposite({
  namespace: STANDARD_NAMESPACE,
  type: 'frame',
  schema: FrameSchema,
  compile: compileFrame,
});

/** 创建稀疏持久化的 Standard Frame composite */
export const createFrame = (input: FrameInput): IRFrame => ({
  namespace: STANDARD_NAMESPACE,
  type: 'frame',
  ...input,
});

/** Frame 的 Core Composite dependency provider */
export const FrameProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: FrameDefinition.namespace, type: FrameDefinition.type }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => FrameDefinition,
});

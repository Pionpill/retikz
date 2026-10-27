import type { CompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';

import { STANDARD_NAMESPACE } from '../../shared';
import { compileFrame } from './pipeline';
import { FrameSchema } from './schema';
import type { IRFrame, InputFrameConfig } from './types';

/** Standard Frame 的官方 Core composite definition */
export const frameDefinition: CompositeDefinition<IRFrame, typeof STANDARD_NAMESPACE, 'frame'> = defineComposite({
  namespace: STANDARD_NAMESPACE,
  type: 'frame',
  schema: FrameSchema,
  compile: compileFrame,
});

/** 创建稀疏持久化的 Standard Frame composite */
export const createFrame = (input: InputFrameConfig): IRFrame => ({
  namespace: STANDARD_NAMESPACE,
  type: 'frame',
  ...input,
});

/** Frame 的 Core Composite dependency provider */
export const frameProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: frameDefinition.namespace, type: frameDefinition.type }),
  makeDefinition: () => frameDefinition,
});

import type { CompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';

import { STANDARD_NAMESPACE } from '../../shared';
import { lowerAxes } from './pipeline';
import { AxesSchema } from './schema';
import type { IRAxes, InputAxes } from './types';

/** Standard Axes 的官方 Core composite definition */
export const axesDefinition = defineComposite({
  namespace: STANDARD_NAMESPACE,
  type: 'axes',
  schema: AxesSchema,
  compile: axes => ({ children: [lowerAxes(axes)] }),
} satisfies CompositeDefinition<IRAxes, typeof STANDARD_NAMESPACE, 'axes'>);

/** 组装持久化的 Standard Axes composite */
export const createAxes = (input: InputAxes): IRAxes => ({
  namespace: STANDARD_NAMESPACE,
  type: 'axes',
  ...input,
});

/** Axes 的 Core Composite dependency provider */
export const axesProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: axesDefinition.namespace, type: axesDefinition.type }),
  makeDefinition: () => axesDefinition,
});

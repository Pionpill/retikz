import type { ExpandCompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';

import { STANDARD_NAMESPACE } from '../../shared';
import { lowerAxes } from './pipeline';
import { AxesSchema } from './schema';
import type { IRAxes, AxesInput } from './types';

/** Standard Axes 的官方 Core composite definition */
export const AxesDefinition = defineComposite({
  namespace: STANDARD_NAMESPACE,
  type: 'axes',
  schema: AxesSchema,
  expand: axes => ({ children: [lowerAxes(axes)] }),
} satisfies ExpandCompositeDefinition<IRAxes, typeof STANDARD_NAMESPACE, 'axes'>);

/** 组装持久化的 Standard Axes composite */
export const createAxes = (input: AxesInput): IRAxes => ({
  namespace: STANDARD_NAMESPACE,
  type: 'axes',
  ...input,
});

/** Axes 的 Core Composite dependency provider */
export const AxesProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: AxesDefinition.namespace, type: AxesDefinition.type }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => AxesDefinition,
});

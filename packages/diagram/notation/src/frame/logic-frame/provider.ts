import type { CompositeDependencyProvider } from '@retikz/core';

import { LogicFrameDefinition } from './definition';

const makeLogicFrameDefinition = () => LogicFrameDefinition;

/** LogicFrame 的 Core Composite dependency provider */
export const LogicFrameProvider: CompositeDependencyProvider = Object.freeze({
  key: Object.freeze({ namespace: LogicFrameDefinition.namespace, type: LogicFrameDefinition.type }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeLogicFrameDefinition,
});

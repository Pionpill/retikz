import type { CoreDependencyProvider } from '@retikz/core';

import { DecisionDefinition, JunctionDefinition, StageDefinition, TerminalDefinition } from './definition';

const makeTerminalDefinition = () => TerminalDefinition;
const makeStageDefinition = () => StageDefinition;
const makeDecisionDefinition = () => DecisionDefinition;
const makeJunctionDefinition = () => JunctionDefinition;

/** Terminal 的 Core Composite dependency provider */
export const TerminalProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: TerminalDefinition.namespace, type: TerminalDefinition.type }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeTerminalDefinition,
});

/** Stage 的 Core Composite dependency provider */
export const StageProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: StageDefinition.namespace, type: StageDefinition.type }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeStageDefinition,
});

/** Decision 的 Core Composite dependency provider */
export const DecisionProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: DecisionDefinition.namespace, type: DecisionDefinition.type }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeDecisionDefinition,
});

/** Junction 的 Core Composite dependency provider */
export const JunctionProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: JunctionDefinition.namespace, type: JunctionDefinition.type }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeJunctionDefinition,
});

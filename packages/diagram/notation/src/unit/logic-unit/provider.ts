import type { CoreDependencyProvider } from '@retikz/core';

import {
  createLogicUnitDefinitions,
  DecisionDefinition,
  JunctionDefinition,
  StageDefinition,
  TerminalDefinition,
} from './definition';

const makeTerminalDefinition = () => TerminalDefinition;
const makeStageDefinition = () => StageDefinition;
const makeDecisionDefinition = () => DecisionDefinition;
const makeJunctionDefinition = () => JunctionDefinition;

/** 创建四类逻辑单元 providers */
export const createLogicUnitProviders = (): ReadonlyArray<CoreDependencyProvider> => {
  const [terminal, stage, decision, junction] = createLogicUnitDefinitions();
  const definitions = [terminal, stage, decision, junction] as const;
  return Object.freeze(
    definitions.map(definition =>
      Object.freeze({
        key: Object.freeze({ capability: 'composite', namespace: definition.namespace, type: definition.type }),
        dependencies: Object.freeze([]),
        datasets: Object.freeze({}),
        makeDefinition: () => definition,
      }),
    ),
  );
};

/** Terminal 的 Core Composite dependency provider */
export const TerminalProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({
    capability: 'composite',
    namespace: TerminalDefinition.namespace,
    type: TerminalDefinition.type,
  }),
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
  key: Object.freeze({
    capability: 'composite',
    namespace: DecisionDefinition.namespace,
    type: DecisionDefinition.type,
  }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeDecisionDefinition,
});

/** Junction 的 Core Composite dependency provider */
export const JunctionProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({
    capability: 'composite',
    namespace: JunctionDefinition.namespace,
    type: JunctionDefinition.type,
  }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeJunctionDefinition,
});

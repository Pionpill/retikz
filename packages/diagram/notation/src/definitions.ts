import type { AnyCompositeDefinition, CoreDependencyProvider } from '@retikz/core';

import { LogicFrameDefinition, LogicFrameProvider } from './frame';
import { ConnectorDefinition, ConnectorProvider, createLogicUnitDefinitions, createLogicUnitProviders } from './unit';

/** 创建当前 Notation 包族的完整 composite definition 集合 */
export const createNotationDefinitions = (): Array<AnyCompositeDefinition> => [
  LogicFrameDefinition,
  ...createLogicUnitDefinitions(),
  ConnectorDefinition,
];

/** 创建当前 Notation 包族的完整 composite dependency provider 集合 */
export const createNotationProviders = (): ReadonlyArray<CoreDependencyProvider> =>
  Object.freeze([LogicFrameProvider, ...createLogicUnitProviders(), ConnectorProvider]);

import type { AnyCompositeDefinition, CoreDependencyProvider } from '@retikz/core';

import { GraphConnectorDefinition, GraphConnectorProvider } from './connector';
import { GraphFrameDefinition, GraphFrameProvider } from './frame';
import { GraphNodeDefinition, GraphNodeProvider } from './node';

/** 创建当前 Graph 包族的完整 composite definition 集合 */
export const createGraphDefinitions = (): Array<AnyCompositeDefinition> => [
  GraphFrameDefinition,
  GraphNodeDefinition,
  GraphConnectorDefinition,
];

/** 创建当前 Graph 包族的完整 composite dependency provider 集合 */
export const createGraphProviders = (): ReadonlyArray<CoreDependencyProvider> =>
  Object.freeze([GraphFrameProvider, GraphNodeProvider, GraphConnectorProvider]);

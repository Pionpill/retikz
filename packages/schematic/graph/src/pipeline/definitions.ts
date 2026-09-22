import type { AnyCompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import { FlexLayoutDefinition } from '@retikz/layout';
import { SurfaceDefinition } from '@retikz/standard/presentation';

import type { GraphDefinitionOptions } from '../contract';
import { resolveGraphDefinitionOptions } from '../providers';
import { createBaseGraphProviders } from './base-providers';
import { createBlockDefinitionFromOptions } from './block/definition';
import { BlockHeaderDefinition, BlockRowDefinition, BlockSectionDefinition } from './block/structure-definition';
import { createEntityDefinitionFromOptions } from './entity/definition';
import { createGraphDefinitionFromOptions } from './graph/definition';
import { GroupBodyAllocationDefinition } from './group';
import { createGroupDefinitionFromOptions } from './group/definition';
import { createRelationDefinitionFromOptions } from './relation/definition';

/** 创建当前 Graph 包族的完整 composite definition 集合 */
export const createGraphDefinitions = (options: GraphDefinitionOptions = {}): Array<AnyCompositeDefinition> => {
  const resolved = resolveGraphDefinitionOptions(options);
  return [
    createGraphDefinitionFromOptions(resolved),
    createGroupDefinitionFromOptions(resolved),
    GroupBodyAllocationDefinition,
    createBlockDefinitionFromOptions(resolved),
    BlockHeaderDefinition,
    BlockSectionDefinition,
    BlockRowDefinition,
    createEntityDefinitionFromOptions(resolved),
    createRelationDefinitionFromOptions(resolved),
    FlexLayoutDefinition,
    SurfaceDefinition,
  ];
};

/** 创建当前 Graph 包族的完整 composite dependency provider 集合 */
export const createGraphProviders = (options?: GraphDefinitionOptions): ReadonlyArray<CoreDependencyProvider> =>
  createBaseGraphProviders(options);

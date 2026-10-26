import type { CoreDependencyProvider, CoreProviderContribution, CompositeCoreProviderKey } from '@retikz/core';
import { defineComposite } from '@retikz/core';
import { createGraphProviders, GraphProviderKey } from '@retikz/graph';
import { OverlayLayoutProvider, FlexLayoutProvider } from '@retikz/layout';
import { LegendProvider } from '@retikz/standard/presentation';

import type { BranchDiagramDefinitionOptions } from '../contract';
import { resolveBranchDefinitionOptions } from '../providers';
import { BranchDiagramArtifactSchema, BranchDiagramSchema } from '../schemas';
import { compileBranchDiagram } from './compile';

/** Branch composite 的公开 provider key */
export const BranchDiagramProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: 'diagram',
  type: 'branch',
});

const makeDefinition: CoreDependencyProvider<BranchDiagramDefinitionOptions>['makeDefinition'] = optionSets => {
  const { definition, options } = resolveBranchDefinitionOptions(optionSets);

  return defineComposite({
    namespace: 'diagram',
    type: 'branch',
    schema: BranchDiagramSchema,
    artifactSchema: BranchDiagramArtifactSchema,
    compile: (source, context) => compileBranchDiagram(source, context, definition, options),
  });
};

/** 携带布局和主题定义的 Branch provider */
export const createBranchDiagramProvider = (
  options: BranchDiagramDefinitionOptions = {},
): CoreDependencyProvider<BranchDiagramDefinitionOptions> => ({
  key: BranchDiagramProviderKey,
  dependencies: [GraphProviderKey, OverlayLayoutProvider.key, FlexLayoutProvider.key, LegendProvider.key],
  params: options,
  makeDefinition,
});

/** 完整 Branch、Graph 与展示装配依赖贡献 */
export const createBranchDiagramProviderContribution = (
  options: BranchDiagramDefinitionOptions = {},
): CoreProviderContribution => ({
  roots: [BranchDiagramProviderKey],
  providers: [
    ...createGraphProviders(options),
    OverlayLayoutProvider,
    LegendProvider,
    createBranchDiagramProvider(options),
  ],
});

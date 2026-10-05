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
const optionsKey = Symbol('branch-options');
let sequence = 0;

const makeDefinition: CoreDependencyProvider['makeDefinition'] = datasets => {
  const optionSets = Object.values(datasets).flatMap(value =>
    value !== null && typeof value === 'object' && optionsKey in value
      ? [(value as { [optionsKey]: BranchDiagramDefinitionOptions })[optionsKey]]
      : [],
  );
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
export const createBranchDiagramProvider = (options: BranchDiagramDefinitionOptions = {}): CoreDependencyProvider => ({
  key: BranchDiagramProviderKey,
  dependencies: [GraphProviderKey, OverlayLayoutProvider.key, FlexLayoutProvider.key, LegendProvider.key],
  datasets: { [`@@retikz/diagram/branch/${sequence++}`]: { [optionsKey]: options } },
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

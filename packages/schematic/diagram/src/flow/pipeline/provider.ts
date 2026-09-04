import type { CompositeCoreProviderKey, CoreDependencyProvider } from '@retikz/core';

import { GraphProviderKey } from '@retikz/graph';
import { FlexLayoutProvider } from '@retikz/layout';
import { LegendProvider } from '@retikz/standard';

import type { FlowDiagramDefinitionOptions } from '../contract';

import { DIAGRAM_NAMESPACE } from '../../_diagram';
import { createFlowDiagramRuntimeDatasets, resolveFlowDiagramRuntimeOptions } from '../providers';
import { FLOW_TYPE } from '../shared';
import { createFlowDiagramDefinitionFromOptions } from './definition';

/** Flow Diagram Composite provider 的公开完整 key */
export const FlowDiagramProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: DIAGRAM_NAMESPACE,
  type: FLOW_TYPE,
});

const makeFlowDiagramDefinition: CoreDependencyProvider['makeDefinition'] = datasets =>
  createFlowDiagramDefinitionFromOptions(resolveFlowDiagramRuntimeOptions(datasets));

/** 创建携带当前 Flow、Diagram 与 Graph definitions 的 provider */
export const createFlowDiagramProvider = (options: FlowDiagramDefinitionOptions = {}): CoreDependencyProvider =>
  Object.freeze({
    key: FlowDiagramProviderKey,
    dependencies: Object.freeze([GraphProviderKey, FlexLayoutProvider.key, LegendProvider.key]),
    datasets: createFlowDiagramRuntimeDatasets(options),
    makeDefinition: makeFlowDiagramDefinition,
  });

/** 使用内置 registries 的默认 Flow Diagram provider */
export const FlowDiagramProvider = createFlowDiagramProvider();

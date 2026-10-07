import type { LayoutCompositeDefinition, CompositeCoreProviderKey, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';
import { GraphProviderKey } from '@retikz/graph';
import { FlexLayoutProvider, GridLayoutProvider } from '@retikz/layout';
import { LegendProvider } from '@retikz/standard/presentation';

import { DIAGRAM_NAMESPACE } from '../../_diagram';
import type { FlowDiagramDefinitionOptions } from '../contract';
import type { ResolvedFlowDiagramDefinitionOptions } from '../providers';
import {
  resolveFlowDiagramDefinitionOptions,
  createFlowDiagramRuntimeDatasets,
  resolveFlowDiagramRuntimeOptions,
} from '../providers';
import type { FlowDiagramArtifact, IRFlowDiagram } from '../schemas';
import { FlowDiagramArtifactSchema, FlowDiagramSchema } from '../schemas';
import { FLOW_TYPE } from '../shared';
import { createCompileFlowDiagram } from './flow';

/** 使用已解析 registries 创建 Flow Diagram Composite Definition */
export const createFlowDiagramDefinitionFromOptions = (
  options: ResolvedFlowDiagramDefinitionOptions,
): LayoutCompositeDefinition<IRFlowDiagram, typeof DIAGRAM_NAMESPACE, typeof FLOW_TYPE, FlowDiagramArtifact> =>
  defineComposite({
    namespace: DIAGRAM_NAMESPACE,
    type: FLOW_TYPE,
    schema: FlowDiagramSchema,
    artifactSchema: FlowDiagramArtifactSchema,
    compile: createCompileFlowDiagram(options),
  });

/** 使用内置 registries 的默认 Flow Diagram Composite Definition */
export const FlowDiagramDefinition: LayoutCompositeDefinition<
  IRFlowDiagram,
  typeof DIAGRAM_NAMESPACE,
  typeof FLOW_TYPE,
  FlowDiagramArtifact
> = createFlowDiagramDefinitionFromOptions(resolveFlowDiagramDefinitionOptions([{}]));

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
    dependencies: Object.freeze([GraphProviderKey, FlexLayoutProvider.key, GridLayoutProvider.key, LegendProvider.key]),
    datasets: createFlowDiagramRuntimeDatasets(options),
    makeDefinition: makeFlowDiagramDefinition,
  });

/** 使用内置 registries 的默认 Flow Diagram provider */
export const FlowDiagramProvider = createFlowDiagramProvider();

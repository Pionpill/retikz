import type { CompositeCoreProviderKey, CompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';
import { GraphProviderKey } from '@retikz/graph';
import { flexLayoutProvider, gridLayoutProvider } from '@retikz/layout';
import { legendProvider } from '@retikz/standard/presentation';

import { DIAGRAM_NAMESPACE } from '../../_diagram';
import type { FlowDiagramDefinitionOptions } from '../contract';
import type { FlowDiagramDefinitionRegistries } from '../providers';
import { resolveFlowDiagramDefinitionOptions } from '../providers';
import type { FlowDiagramArtifact, IRFlowDiagram } from '../schemas';
import { FlowDiagramArtifactSchema, FlowDiagramSchema } from '../schemas';
import { FLOW_TYPE } from '../shared';
import { createCompileFlowDiagram } from './flow';

/** 使用已解析 registries 创建 Flow Diagram Composite Definition */
const createFlowDiagramDefinitionFromOptions = (
  options: FlowDiagramDefinitionRegistries,
): CompositeDefinition<IRFlowDiagram, typeof DIAGRAM_NAMESPACE, typeof FLOW_TYPE, FlowDiagramArtifact> =>
  defineComposite({
    namespace: DIAGRAM_NAMESPACE,
    type: FLOW_TYPE,
    schema: FlowDiagramSchema,
    artifactSchema: FlowDiagramArtifactSchema,
    compile: createCompileFlowDiagram(options),
  });

/** 使用内置 registries 的默认 Flow Diagram Composite Definition */
export const flowDiagramDefinition: CompositeDefinition<
  IRFlowDiagram,
  typeof DIAGRAM_NAMESPACE,
  typeof FLOW_TYPE,
  FlowDiagramArtifact
> = createFlowDiagramDefinitionFromOptions(resolveFlowDiagramDefinitionOptions([{}]));

/** Flow Diagram Composite provider 的公开完整 key */
export const flowDiagramProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: DIAGRAM_NAMESPACE,
  type: FLOW_TYPE,
});

const makeFlowDiagramDefinition: CoreDependencyProvider<FlowDiagramDefinitionOptions>['makeDefinition'] =
  contributions => createFlowDiagramDefinitionFromOptions(resolveFlowDiagramDefinitionOptions(contributions));

/** 创建携带当前 Flow、Diagram 与 Graph definitions 的 provider */
export const createFlowDiagramProvider = (
  options: FlowDiagramDefinitionOptions = {},
): CoreDependencyProvider<FlowDiagramDefinitionOptions> =>
  Object.freeze({
    key: flowDiagramProviderKey,
    dependencies: Object.freeze([GraphProviderKey, flexLayoutProvider.key, gridLayoutProvider.key, legendProvider.key]),
    params: options,
    makeDefinition: makeFlowDiagramDefinition,
  });

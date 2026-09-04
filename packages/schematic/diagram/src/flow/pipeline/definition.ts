import type { LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { ResolvedFlowDiagramDefinitionOptions } from '../providers';
import type { FlowDiagramArtifact, IRFlowDiagram } from '../schemas';

import { DIAGRAM_NAMESPACE } from '../../_diagram';
import { resolveFlowDiagramDefinitionOptions } from '../providers';
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

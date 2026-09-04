import type { FlowDiagramDefinitionOptions } from '@retikz/diagram/flow';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

import { createFlowDiagramProviderContribution } from '@retikz/diagram/flow';

import type { InputFlowDiagram } from './normalize';

import { FlowDiagramEmbedKind } from './constants';
import { normalizeFlowDiagram } from './normalize';
import { flowDiagramDefinitionOptionsOf } from './providers';

/** Flow Diagram embed 同时携带 Source authoring 输入与 definitions */
export type FlowDiagramInputEmbedProps = InputFlowDiagram & FlowDiagramDefinitionOptions;

const inputOf = (props: FlowDiagramInputEmbedProps): InputFlowDiagram => {
  const {
    diagramThemeStyles: _diagramThemeStyles,
    flowThemeStyles: _flowThemeStyles,
    flowLayouts: _flowLayouts,
    defaultFlowLayout: _defaultFlowLayout,
    entityRoles: _entityRoles,
    entityKinds: _entityKinds,
    entityPredicates: _entityPredicates,
    relationRoles: _relationRoles,
    relationKinds: _relationKinds,
    relationPredicates: _relationPredicates,
    graphThemeStyles: _graphThemeStyles,
    ...input
  } = props;
  void _diagramThemeStyles;
  void _flowThemeStyles;
  void _flowLayouts;
  void _defaultFlowLayout;
  void _entityRoles;
  void _entityKinds;
  void _entityPredicates;
  void _relationRoles;
  void _relationKinds;
  void _relationPredicates;
  void _graphThemeStyles;
  return input;
};

/** Flow Diagram Source root 的 InputEmbed adapter */
export const FlowDiagramInputEmbedAdapter: InputEmbedAdapter<FlowDiagramInputEmbedProps> = {
  kind: FlowDiagramEmbedKind,
  lower: props => ({
    node: normalizeFlowDiagram(inputOf(props)),
    providerDependencies: createFlowDiagramProviderContribution(flowDiagramDefinitionOptionsOf(props)),
  }),
};

/** 创建 Flow Diagram Source root 的 authoring embed 节点 */
export const flowDiagram = (id: string, input: FlowDiagramInputEmbedProps): InputEmbed<FlowDiagramInputEmbedProps> => ({
  type: 'embed',
  kind: FlowDiagramEmbedKind,
  id,
  props: input,
});

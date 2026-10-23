import type { FlowDiagramDefinitionOptions } from '@retikz/diagram/flow';

/** 从 adapter props 提取只供 Flow provider assembly 使用的 definitions */
export const flowDiagramDefinitionOptionsOf = (props: FlowDiagramDefinitionOptions): FlowDiagramDefinitionOptions => ({
  diagramThemeDefinitions: props.diagramThemeDefinitions,
  flowThemeDefinitions: props.flowThemeDefinitions,
  flowLayouts: props.flowLayouts,
  defaultFlowLayout: props.defaultFlowLayout,
  entityRoles: props.entityRoles,
  entityKinds: props.entityKinds,
  entityPredicates: props.entityPredicates,
  relationRoles: props.relationRoles,
  relationKinds: props.relationKinds,
  relationPredicates: props.relationPredicates,
  graphThemeDefinitions: props.graphThemeDefinitions,
});

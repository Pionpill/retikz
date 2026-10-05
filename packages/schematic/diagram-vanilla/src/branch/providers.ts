import type { BranchDiagramDefinitionOptions } from '@retikz/diagram/branch';

/** 从 adapter props 提取只供 Branch provider assembly 使用的 definitions */
export const branchDiagramDefinitionOptionsOf = (
  props: BranchDiagramDefinitionOptions,
): BranchDiagramDefinitionOptions => ({
  diagramThemeStyles: props.diagramThemeStyles,
  branchLayouts: props.branchLayouts,
  defaultBranchLayout: props.defaultBranchLayout,
  entityRoles: props.entityRoles,
  entityKinds: props.entityKinds,
  entityPredicates: props.entityPredicates,
  relationRoles: props.relationRoles,
  relationKinds: props.relationKinds,
  relationPredicates: props.relationPredicates,
  graphThemeStyles: props.graphThemeStyles,
});

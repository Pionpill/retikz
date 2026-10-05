import type { BranchDiagramDefinitionOptions } from '@retikz/diagram/branch';
import { createBranchDiagramProviderContribution } from '@retikz/diagram/branch';
import type { InputEmbed, SynchronousInputEmbedAdapter } from '@retikz/vanilla';

import { BranchDiagramEmbedKind } from './constants';
import type { InputBranchDiagram } from './normalize';
import { normalizeBranchDiagram } from './normalize';
import { branchDiagramDefinitionOptionsOf } from './providers';

/** Branch Diagram embed 同时携带 Source authoring 输入与 definitions */
export type BranchDiagramInputEmbedProps = InputBranchDiagram & BranchDiagramDefinitionOptions;

const inputOf = (props: BranchDiagramInputEmbedProps): InputBranchDiagram => {
  const {
    diagramThemeStyles: _diagramThemeStyles,
    branchLayouts: _branchLayouts,
    defaultBranchLayout: _defaultBranchLayout,
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
  void _branchLayouts;
  void _defaultBranchLayout;
  void _entityRoles;
  void _entityKinds;
  void _entityPredicates;
  void _relationRoles;
  void _relationKinds;
  void _relationPredicates;
  void _graphThemeStyles;
  return input;
};

/** Branch Diagram Source root 的 InputEmbed adapter */
export const BranchDiagramInputEmbedAdapter: SynchronousInputEmbedAdapter<BranchDiagramInputEmbedProps> = {
  kind: BranchDiagramEmbedKind,
  lower: props => ({
    node: normalizeBranchDiagram(inputOf(props)),
    providerDependencies: createBranchDiagramProviderContribution(branchDiagramDefinitionOptionsOf(props)),
  }),
};

/**
 * 创建 Branch Diagram Source root 的 authoring embed 节点
 * @param input Branch 声明与运行时扩展；由 adapter 在编译时组装 Source 和 provider
 * @returns 保留 input 对象引用的 embed 节点，不在此处执行布局
 */
export const branchDiagram = (input: BranchDiagramInputEmbedProps): InputEmbed<BranchDiagramInputEmbedProps> => ({
  type: 'embed',
  kind: BranchDiagramEmbedKind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});

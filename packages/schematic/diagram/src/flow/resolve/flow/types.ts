import type { ResolvedTheme } from '@retikz/core';
import type { GraphDefinitionOptions, IRGraphEntity, IRGraphRelation, IRGroup } from '@retikz/graph';

import type { FlowThemeStyleDefinition } from '../../contract';
import type {
  IRFlowDiagram,
  IRFlowEntity,
  IRFlowEntityLayout,
  IRFlowEntityStyle,
  IRFlowGroup,
  IRFlowGroupStyle,
  IRFlowLayout,
  IRFlowLayoutIntent,
  IRFlowRelation,
  IRFlowRelationLayout,
  IRFlowRelationStyle,
} from '../../schemas';

/** Flow Source 中可修复字段的 JSON path */
export type FlowSourcePath = ReadonlyArray<string | number>;

/** 解析一个 Flow Source 所需的 Theme 与开放 definitions */
export type FlowResolveContext = Readonly<{
  theme: ResolvedTheme;
  flowThemeStyles: ReadonlyMap<string, FlowThemeStyleDefinition>;
  graph?: GraphDefinitionOptions;
}>;

/** 解析后的 Flow Entity */
export type CanonicalFlowEntity = Readonly<{
  type: 'entity';
  id: string;
  source: IRFlowEntity;
  graph: IRGraphEntity;
  rank?: number;
  style: IRFlowEntityStyle;
  layout: IRFlowEntityLayout;
  path: FlowSourcePath;
}>;

/** 解析后投影为 Graph Group 的可见 Flow Group */
export type CanonicalFlowGroup = Readonly<{
  type: 'group';
  id: string;
  source: IRFlowGroup;
  graph: IRGroup;
  rank?: number;
  layout: IRFlowLayoutIntent;
  style: IRFlowGroupStyle;
  elements: ReadonlyArray<CanonicalFlowElement>;
  path: FlowSourcePath;
}>;

/** 解析后只建立固定空间排列的 Flow Layout */
export type CanonicalFlowLayout = Readonly<{
  type: 'layout';
  id: string;
  source: IRFlowLayout;
  rank?: number;
  layout: IRFlowLayoutIntent;
  elements: ReadonlyArray<CanonicalFlowElement>;
  path: FlowSourcePath;
}>;

/** 解析后的 Flow element */
export type CanonicalFlowElement = CanonicalFlowEntity | CanonicalFlowGroup | CanonicalFlowLayout;

/** 解析后的 Flow Relation */
export type CanonicalFlowRelation = Readonly<{
  source: IRFlowRelation;
  graph: IRGraphRelation;
  style: IRFlowRelationStyle;
  layout: IRFlowRelationLayout;
  path: FlowSourcePath;
}>;

/** Flow Source 与有效配置确定后的内部完整形态 */
export type CanonicalFlowDiagram = Readonly<{
  source: IRFlowDiagram;
  layout: IRFlowLayoutIntent;
  elements: ReadonlyArray<CanonicalFlowElement>;
  relations: ReadonlyArray<CanonicalFlowRelation>;
  elementPaths: ReadonlyMap<string, FlowSourcePath>;
}>;

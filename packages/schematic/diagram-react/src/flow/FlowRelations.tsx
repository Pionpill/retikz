import type { InputFlowRelation } from '@retikz/diagram-vanilla/flow';
import type { FC } from 'react';

import type { FlowMarkerComponent } from './authoring';

/** Flow 批量 Relation 支持的单项输入 */
export type FlowRelationItem = readonly [source: string, target: string] | InputFlowRelation;

/** Flow 批量 Relation 的 React 编写参数 */
export type FlowRelationsProps = Readonly<{
  /** 按 authoring 顺序展开的 endpoint tuple 或完整输入 */
  items: ReadonlyArray<FlowRelationItem>;
  /** 是否作为 Flow 根的完整 Relation 清单，启用后不能与其它 Relation marker 共存
   * @default false
   */
  complete?: boolean;
}>;

const FlowRelationsComponent: FC<FlowRelationsProps> = () => null;

/** 在 FlowDiagram 根级批量声明 Relation */
export const FlowRelations = FlowRelationsComponent as FlowMarkerComponent<FlowRelationsProps>;

FlowRelations.displayName = 'FlowRelations';
FlowRelations.flowMarkerKind = 'relations';

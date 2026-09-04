import type { InputFlowEntity } from '@retikz/diagram-vanilla/flow';
import type { FC } from 'react';

import type { FlowMarkerComponent } from './authoring';

/** Flow 批量 Entity 支持的单项输入 */
export type FlowEntityItem = string | InputFlowEntity;

/** Flow 批量 Entity 的 React 编写参数 */
export type FlowEntitiesProps = Readonly<{
  /** 按 authoring 顺序展开的 Entity 文本或完整输入 */
  items: ReadonlyArray<FlowEntityItem>;
  /** 是否作为当前 owner 的完整 Entity 清单，启用后不能与同 owner 的其它 Entity marker 共存
   * @default false
   */
  complete?: boolean;
}>;

const FlowEntitiesComponent: FC<FlowEntitiesProps> = () => null;

/** 在当前位置批量声明 Flow Entity */
export const FlowEntities = FlowEntitiesComponent as FlowMarkerComponent<FlowEntitiesProps>;

FlowEntities.displayName = 'FlowEntities';
FlowEntities.flowMarkerKind = 'entities';

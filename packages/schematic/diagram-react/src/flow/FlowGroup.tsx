import type { InputFlowGroup } from '@retikz/diagram-vanilla/flow';
import type { FC, ReactNode } from 'react';

import type { FlowMarkerComponent } from './authoring';

type FlowGroupMarkerProps<TGroup extends InputFlowGroup = InputFlowGroup> = TGroup extends InputFlowGroup
  ? Omit<TGroup, 'children'>
  : never;

/** Flow Group 的 React 编写参数 */
export type FlowGroupProps = FlowGroupMarkerProps &
  Readonly<{
    /** 递归 Flow Entity、Group 或 Layout children */
    children?: ReactNode;
  }>;

const FlowGroupComponent: FC<FlowGroupProps> = () => null;

/** 声明 FlowDiagram 中的可见 Group */
export const FlowGroup = FlowGroupComponent as FlowMarkerComponent<FlowGroupProps>;

FlowGroup.displayName = 'FlowGroup';
FlowGroup.flowMarkerKind = 'group';

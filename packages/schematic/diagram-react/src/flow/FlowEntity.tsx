import type { InputFlowEntity } from '@retikz/diagram-vanilla/flow';
import type { FC } from 'react';

import type { FlowMarkerComponent } from './authoring';

/** Flow Entity 的 React 编写参数 */
export type FlowEntityProps = InputFlowEntity;

const FlowEntityComponent: FC<FlowEntityProps> = () => null;

/** 声明 FlowDiagram 中的 Entity */
export const FlowEntity = FlowEntityComponent as FlowMarkerComponent<FlowEntityProps>;

FlowEntity.displayName = 'FlowEntity';
FlowEntity.flowMarkerKind = 'entity';

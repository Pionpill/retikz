import type { InputFlowRelation } from '@retikz/diagram-vanilla/flow';
import type { FC } from 'react';

import type { FlowMarkerComponent } from './authoring';

/** Flow Relation 的 React 编写参数 */
export type FlowRelationProps = InputFlowRelation;

const FlowRelationComponent: FC<FlowRelationProps> = () => null;

/** 声明 FlowDiagram 根级 Relation */
export const FlowRelation = FlowRelationComponent as FlowMarkerComponent<FlowRelationProps>;

FlowRelation.displayName = 'FlowRelation';
FlowRelation.flowMarkerKind = 'relation';

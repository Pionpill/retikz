import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps, logicFigureRelationKinds } from '@/modules/docs/components/logic-figure';

/** 单条执行链的阶段标签 */
export type TransformMechanismFlowProps = {
  stages: Array<string>;
  /** 阶段的阅读方向 */
  direction?: 'down' | 'right';
};
/** 复用 Flow 自动排列执行链 */
export const TransformMechanismFlow: FC<TransformMechanismFlowProps> = props => {
  const { stages, direction = 'down' } = props;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} relationKinds={logicFigureRelationKinds}>
      <FlowLayout id="pipeline" kind="linear" direction={direction} align="center" gap={20}>
        <FlowEntities
          items={stages.map((text, index) => ({ id: `stage-${index}`, text, role: 'activity' as const }))}
        />
      </FlowLayout>
      <FlowRelations
        items={stages.slice(1).map((_, index) => ({ source: `stage-${index}`, target: `stage-${index + 1}` }))}
      />
    </PreviewFlowDiagram>
  );
};

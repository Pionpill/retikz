import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { coordinateOverviewI18n } from './coordinate-overview.i18n';

/** 坐标解析总览的语言 */
export type CoordinateOverviewProps = { lang?: Lang };

/** 从声明追踪到局部几何与分组变换 */
const CoordinateOverview: FC<CoordinateOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const text = coordinateOverviewI18n[lang];
  const stages = ['input', 'context', 'resolve', 'layout', 'close', 'output'] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="coordinates" kind="linear" direction="down" itemWidth="match-largest" gap={32 * (2 / 3)}>
        <FlowEntities
          items={stages.map(id => ({
            id,
            text: text[id],
            role: id === 'input' || id === 'output' ? 'state' : 'activity',
            ...(id === 'resolve' ? { kind: 'docs.logic.important' } : {}),
          }))}
        />
      </FlowLayout>
      <FlowRelations items={stages.slice(1).map((id, index) => ({ source: stages[index], target: id }))} />
    </PreviewFlowDiagram>
  );
};

export default CoordinateOverview;

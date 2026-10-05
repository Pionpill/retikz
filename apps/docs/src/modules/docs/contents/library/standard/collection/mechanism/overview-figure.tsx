import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { overviewFigureI18n } from './overview-figure.i18n';

/** 图示属性 */
export type OverviewFigureProps = { lang?: Lang };

/** 展示当前小节的集合处理机制 */
const OverviewFigure: FC<OverviewFigureProps> = props => {
  const { lang = 'zh' } = props;
  const t = overviewFigureI18n[lang];
  return (
    <PreviewFlowDiagram
      layout={{ direction: 'down' }}
      {...logicFigureGraphProps()}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout
        id="stages"
        kind="grid"
        placements={[
          ['s0', 's1', 's2'],
          ['s3', 's4', 's5'],
        ]}
      >
        <FlowEntities
          items={t.map((text, i) => ({ id: `s${i}`, text, role: i === 0 || i === 5 ? 'state' : 'activity' }))}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 's0', target: 's1' },
          { source: 's1', target: 's2' },
          { source: { id: 's2', side: 'bottom' }, target: { id: 's3', side: 'top' }, routing: { kind: 'orthogonal' } },
          { source: 's3', target: 's4' },
          { source: 's4', target: 's5' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default OverviewFigure;

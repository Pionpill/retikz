import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { boundsCandidateFlowI18n } from './bounds-candidate-flow.i18n';

/** 展示不同几何输入如何汇入候选点集，再计算边界 */
export type BoundsCandidateFlowI18nFigureProps = Readonly<{ lang?: Lang }>;

const Demo: FC<BoundsCandidateFlowI18nFigureProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = boundsCandidateFlowI18n[lang];

  return (
    <FlowDiagram {...logicFigureGraphProps()}>
      <FlowLayout kind="linear" id="bounds" direction="right" align="center" gap={32}>
        <FlowEntities items={[{ id: 'input', text: i18n.label1, role: 'participant' }]} />
        <FlowLayout kind="linear" id="geometry-types" direction="down" align="center" gap={32}>
          <FlowEntities
            items={[
              { id: 'point', text: i18n.label2, role: 'participant', group: 'point' },
              { id: 'curve', text: i18n.label3, role: 'participant', group: 'curve' },
              { id: 'shape', text: i18n.label4, role: 'participant', group: 'shape' },
            ]}
          />
        </FlowLayout>
        <FlowLayout kind="linear" id="candidate-geometry" direction="down" align="center" gap={32}>
          <FlowEntities
            items={[
              { id: 'direct', text: i18n.label5, role: 'activity', group: 'point' },
              { id: 'extrema', text: i18n.label6, role: 'activity', group: 'curve' },
              { id: 'derive', text: i18n.label7, role: 'activity', group: 'shape' },
            ]}
          />
        </FlowLayout>
        <FlowLayout kind="linear" id="reduction" direction="right" align="center" gap={32}>
          <FlowEntities items={[{ id: 'candidates', text: i18n.label8, role: 'activity' }]} />
          <FlowEntities items={[{ id: 'calculate-bounds', text: i18n.label9, role: 'activity' }]} />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'input', target: 'point', group: 'point' },
          { source: 'point', target: 'direct', group: 'point' },
          { source: 'input', target: 'curve', group: 'curve' },
          { source: 'curve', target: 'extrema', group: 'curve' },
          { source: 'input', target: 'shape', group: 'shape' },
          { source: 'shape', target: 'derive', group: 'shape' },
          { source: 'direct', target: 'candidates', group: 'point' },
          { source: 'extrema', target: 'candidates', group: 'curve' },
          { source: 'derive', target: 'candidates', group: 'shape' },
          { source: 'candidates', target: 'calculate-bounds' },
        ]}
      />
    </FlowDiagram>
  );
};

export default Demo;

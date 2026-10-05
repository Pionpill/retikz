import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { legendPipelineI18n } from './legend-pipeline.i18n';

/** 配图语言参数 */
export type LegendPipelineProps = { lang?: Lang };

/** Legend 测量、排布与并列输出的流程 */
const LegendPipeline: FC<LegendPipelineProps> = props => {
  const { lang = 'zh' } = props;
  const labels = legendPipelineI18n[lang];
  const text = (index: number) =>
    labels[index].map((line, row) => ({ text: line, ...(row === 0 ? {} : { fill: 'gray', font: { size: 12 } }) }));

  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="pipeline" kind="linear" direction="right">
        <FlowEntities
          items={[
            { id: 'ir', text: text(0), role: 'resource', kind: 'docs.logic.importantData' },
            { id: 'definition', text: text(1), role: 'activity' },
            { id: 'resolve', text: text(2), role: 'activity' },
            { id: 'replay', text: text(3), role: 'activity', kind: 'docs.logic.important' },
          ]}
        />
        <FlowLayout id="outputs" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'core-ir', text: text(4), role: 'resource' },
              { id: 'artifact', text: text(5), role: 'resource', kind: 'docs.logic.importantData' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'ir', target: 'definition' },
          { source: 'definition', target: 'resolve' },
          { source: 'resolve', target: 'replay' },
          { source: 'replay', target: 'core-ir' },
          { source: 'replay', target: 'artifact' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default LegendPipeline;

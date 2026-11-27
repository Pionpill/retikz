import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { pipelineProcessingI18n } from './pipeline-processing.i18n';

/** 交接图的语言 */
export type PipelineProcessingProps = { lang?: Lang };

/** 展示当前阶段的输入、处理与交接关系 */
const PipelineProcessing: FC<PipelineProcessingProps> = props => {
  const { lang = 'zh' } = props;
  const text = pipelineProcessingI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="pipeline" kind="linear" direction="right">
        <FlowLayout id="column-0" kind="linear" direction="down">
          <FlowEntities
            items={[
              {
                id: 'input',
                role: 'state',
                text: [{ text: text.input[0] }, { text: text.input[1], font: { size: 12 }, fill: 'gray' }],
              },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="column-1" kind="linear" direction="down">
          <FlowEntities
            items={[
              {
                id: 'prepare',
                role: 'activity',
                kind: 'docs.logic.important',
                text: [{ text: text.prepare[0] }, { text: text.prepare[1], font: { size: 12 }, fill: 'gray' }],
              },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="column-2" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              {
                id: 'initial',
                role: 'activity',
                text: [{ text: text.initial[0] }, { text: text.initial[1], font: { size: 12 }, fill: 'gray' }],
              },
              {
                id: 'mounted',
                role: 'activity',
                text: [{ text: text.mounted[0] }, { text: text.mounted[1], font: { size: 12 }, fill: 'gray' }],
              },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="column-3" kind="linear" direction="down">
          <FlowEntities
            items={[
              {
                id: 'core',
                role: 'activity',
                kind: 'docs.logic.important',
                text: [{ text: text.core[0] }, { text: text.core[1], font: { size: 12 }, fill: 'gray' }],
              },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'input', target: 'prepare', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'prepare', target: 'initial', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'prepare', target: 'mounted', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'initial', target: 'core', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'mounted', target: 'core', routing: { kind: 'orthogonal', cornerRadius: 0 } },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default PipelineProcessing;

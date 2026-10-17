import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { pipelineInputI18n } from './pipeline-input.i18n';

/** 交接图的语言 */
export type PipelineInputProps = { lang?: Lang };

/** 展示当前阶段的输入、处理与交接关系 */
const PipelineInput: FC<PipelineInputProps> = props => {
  const { lang = 'zh' } = props;
  const text = pipelineInputI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="pipeline" kind="linear" direction="right">
        <FlowLayout id="column-0" kind="linear" direction="down">
          <FlowEntities
            items={[
              {
                id: 'jsx',
                role: 'state',
                text: [{ text: text.jsx[0] }, { text: text.jsx[1], font: { size: 12 }, fill: 'gray' }],
              },
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
                id: 'layout',
                role: 'activity',
                text: [{ text: text.layout[0] }, { text: text.layout[1], font: { size: 12 }, fill: 'gray' }],
              },
              {
                id: 'direct',
                role: 'activity',
                text: [{ text: text.direct[0] }, { text: text.direct[1], font: { size: 12 }, fill: 'gray' }],
              },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="column-2" kind="linear" direction="down">
          <FlowEntities
            items={[
              {
                id: 'vanilla',
                role: 'activity',
                kind: 'docs.logic.important',
                text: [{ text: text.vanilla[0] }, { text: text.vanilla[1], font: { size: 12 }, fill: 'gray' }],
              },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'jsx', target: 'layout', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'input', target: 'direct', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'layout', target: 'vanilla', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'direct', target: 'vanilla', routing: { kind: 'orthogonal', cornerRadius: 0 } },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default PipelineInput;

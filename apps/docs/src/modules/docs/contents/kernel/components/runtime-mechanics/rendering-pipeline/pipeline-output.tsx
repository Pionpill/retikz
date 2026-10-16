import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { pipelineOutputI18n } from './pipeline-output.i18n';

/** 交接图的语言 */
export type PipelineOutputProps = { lang?: Lang };

/** 展示当前阶段的输入、处理与交接关系 */
const PipelineOutput: FC<PipelineOutputProps> = props => {
  const { lang = 'zh' } = props;
  const text = pipelineOutputI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="pipeline" kind="linear" direction="right">
        <FlowLayout id="column-0" kind="linear" direction="down">
          <FlowEntities
            items={[
              {
                id: 'scene',
                role: 'state',
                text: [{ text: text.scene[0] }, { text: text.scene[1], font: { size: 12 }, fill: 'gray' }],
              },
            ]}
          />
        </FlowLayout>
        <FlowLayout
          id="outputs"
          kind="grid"
          itemWidth="match-largest"
          placements={[
            ['svg', 'svghost'],
            ['canvas', 'canvashost'],
          ]}
        >
          <FlowEntities
            items={['svg', 'svghost', 'canvas', 'canvashost'].map(id => ({
              id,
              role: 'activity',
              text: [{ text: text[id][0] }, { text: text[id][1], font: { size: 12 }, fill: 'gray' }],
            }))}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'scene', target: 'svg', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'scene', target: 'canvas', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'svg', target: 'svghost', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'canvas', target: 'canvashost', routing: { kind: 'orthogonal', cornerRadius: 0 } },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default PipelineOutput;

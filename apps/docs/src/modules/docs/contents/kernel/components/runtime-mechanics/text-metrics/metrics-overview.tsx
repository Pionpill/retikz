import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { metricsOverviewI18n } from './metrics-overview.i18n';

/** 文字度量总览的语言选项 */
export type MetricsOverviewProps = { lang?: Lang };

/** 展示文字度量的职责交接 */
const MetricsOverview: FC<MetricsOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const t = metricsOverviewI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="flow" kind="linear" direction="down" containerWidth="match-largest">
        <FlowLayout id="row-0" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={[
              {
                id: 'input',
                role: 'state',
                text: [{ text: t.input[0] }, { text: t.input[1], font: { size: 12 }, fill: 'gray' }],
              },
              {
                id: 'provide',
                role: 'activity',
                text: [{ text: t.provide[0] }, { text: t.provide[1], font: { size: 12 }, fill: 'gray' }],
              },
              {
                id: 'content',
                role: 'activity',
                text: [{ text: t.content[0] }, { text: t.content[1], font: { size: 12 }, fill: 'gray' }],
              },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="row-1" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={[
              {
                id: 'node',
                role: 'activity',
                text: [{ text: t.node[0] }, { text: t.node[1], font: { size: 12 }, fill: 'gray' }],
              },
              {
                id: 'scene',
                role: 'state',
                text: [{ text: t.scene[0] }, { text: t.scene[1], font: { size: 12 }, fill: 'gray' }],
              },
              {
                id: 'render',
                role: 'activity',
                text: [{ text: t.render[0] }, { text: t.render[1], font: { size: 12 }, fill: 'gray' }],
              },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'input', target: 'provide', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'provide', target: 'content', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'content', target: 'node', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'node', target: 'scene', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'scene', target: 'render', routing: { kind: 'orthogonal', cornerRadius: 0 } },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default MetricsOverview;

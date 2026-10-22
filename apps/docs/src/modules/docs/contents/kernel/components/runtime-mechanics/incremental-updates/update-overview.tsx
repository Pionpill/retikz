import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { text } from './update-overview.i18n';

/** 机制图的语言选项 */
export type UpdateOverviewProps = { lang?: Lang };

/** 展示增量更新的阶段与交接 */
const UpdateOverview: FC<UpdateOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const t = text[lang];
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
                id: 'runtime',
                role: 'activity',
                text: [{ text: t.runtime[0] }, { text: t.runtime[1], font: { size: 12 }, fill: 'gray' }],
              },
              {
                id: 'core',
                role: 'activity',
                text: [{ text: t.core[0] }, { text: t.core[1], font: { size: 12 }, fill: 'gray' }],
              },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="row-1" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={[
              {
                id: 'host',
                role: 'activity',
                text: [{ text: t.host[0] }, { text: t.host[1], font: { size: 12 }, fill: 'gray' }],
              },
              {
                id: 'result',
                role: 'state',
                text: [{ text: t.result[0] }, { text: t.result[1], font: { size: 12 }, fill: 'gray' }],
              },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'input', target: 'runtime', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'runtime', target: 'core', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'core', target: 'result', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'result', target: 'host', routing: { kind: 'orthogonal', cornerRadius: 0 } },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default UpdateOverview;

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { compositionOverviewI18n } from './composition-overview.i18n';

/** 组件组合图的语言选项 */
export type CompositionOverviewProps = { lang?: Lang };
/** 展示组件组合的跨包主线 */
const CompositionOverview: FC<CompositionOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const t = compositionOverviewI18n[lang];
  const rows = [
    ['input', 'define', 'expand'],
    ['layout', 'lower', 'scene'],
  ];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="flow" kind="linear" direction="down" containerWidth="match-largest">
        {rows.map((row, index) => (
          <FlowLayout key={index} id={`row-${index}`} kind="linear" direction="right" itemWidth="fill">
            <FlowEntities
              items={row.map(id => ({
                id,
                role: id === 'scene' || id === 'input' ? 'state' : 'activity',
                text: [{ text: t[id][0] }, { text: t[id][1], font: { size: 12 }, fill: 'gray' }],
              }))}
            />
          </FlowLayout>
        ))}
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'input', target: 'define', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'define', target: 'expand', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'expand', target: 'layout', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'layout', target: 'lower', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'lower', target: 'scene', routing: { kind: 'orthogonal', cornerRadius: 0 } },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default CompositionOverview;

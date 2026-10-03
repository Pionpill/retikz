import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { flowBendRoutingI18n } from './flow-bend-routing.i18n';

/** 自动避让流程图语言 */
export type FlowBendRoutingProps = Readonly<{ lang?: Lang }>;

/** 从有限候选到路线交付的自动避让流程 */
const Demo: FC<FlowBendRoutingProps> = props => {
  const { lang = 'zh' } = props;
  const copy = flowBendRoutingI18n[lang];
  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      layout={{ direction: 'down' }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout id="rows" kind="linear" direction="down" gap={48}>
        <FlowLayout id="checks" kind="linear" direction="right" gap={24}>
          <FlowEntities
            items={[
              {
                id: 'candidates',
                role: 'activity',
                text: [{ text: copy.candidates }, { text: copy.candidatesNote, fill: 'gray', font: { size: 12 } }],
              },
              {
                id: 'bounds',
                role: 'activity',
                kind: LogicFigureEntityKind.Important,
                text: [{ text: copy.bounds }, { text: copy.boundsNote, fill: 'gray', font: { size: 12 } }],
              },
              {
                id: 'contact',
                role: 'activity',
                text: [{ text: copy.contact }, { text: copy.contactNote, fill: 'gray', font: { size: 12 } }],
              },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="selection" kind="linear" direction="right" gap={24}>
          <FlowEntities
            items={[
              {
                id: 'nodes',
                role: 'activity',
                text: [{ text: copy.nodes }, { text: copy.nodesNote, fill: 'gray', font: { size: 12 } }],
              },
              {
                id: 'labels',
                role: 'activity',
                text: [{ text: copy.labels }, { text: copy.labelsNote, fill: 'gray', font: { size: 12 } }],
              },
              {
                id: 'result',
                role: 'activity',
                text: [{ text: copy.result }, { text: copy.resultNote, fill: 'gray', font: { size: 12 } }],
              },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          ['candidates', 'bounds'],
          ['bounds', 'contact'],
          { source: 'contact', target: 'nodes', routing: { kind: 'orthogonal' } },
          ['nodes', 'labels'],
          ['labels', 'result'],
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default Demo;

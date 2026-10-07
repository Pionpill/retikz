import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { participantRelationshipI18n } from './participant-relationship.i18n';

/** Runtime 与参与者关系图的语言配置 */
export type ParticipantRelationshipProps = Readonly<{ lang?: Lang }>;

/** 展示统一事务调度与参与者各自的逻辑、读取视图 */
const ParticipantRelationship: FC<ParticipantRelationshipProps> = props => {
  const { lang = 'zh' } = props;
  const text = participantRelationshipI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="participant-relationship" kind="linear" direction="right" align="center">
        <FlowEntities
          items={[
            { id: 'relationship-runtime', text: text.runtime, role: 'participant', kind: 'docs.logic.important' },
          ]}
        />
        <FlowLayout id="relationship-participants" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'relationship-a', text: text.a, role: 'participant' },
              { id: 'relationship-b', text: text.b, role: 'participant' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="relationship-views" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'relationship-view-a', text: text.viewA, role: 'state' },
              { id: 'relationship-view-b', text: text.viewB, role: 'state' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'relationship-runtime', target: 'relationship-a', label: text.schedule },
          { source: 'relationship-runtime', target: 'relationship-b', label: text.schedule },
          { source: 'relationship-a', target: 'relationship-view-a', label: text.read },
          { source: 'relationship-b', target: 'relationship-view-b', label: text.read },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default ParticipantRelationship;

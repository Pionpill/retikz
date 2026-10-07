import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { participantOverviewI18n } from './participant-overview.i18n';

/** 提交图的语言配置 */
export type ParticipantOverviewProps = Readonly<{ lang?: Lang }>;
/** 展示外部状态提交的阶段关系 */
const ParticipantOverview: FC<ParticipantOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const text = participantOverviewI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="participant-overview" kind="linear" direction="right" align="center">
        <FlowEntities
          items={[
            { id: 'participant-overview-candidate', text: text.candidate, role: 'state' },
            { id: 'participant-overview-external', text: text.external, role: 'activity' },
            { id: 'participant-overview-publish', text: text.publish, role: 'state' },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'participant-overview-candidate', target: 'participant-overview-external' },
          { source: 'participant-overview-external', target: 'participant-overview-publish' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default ParticipantOverview;

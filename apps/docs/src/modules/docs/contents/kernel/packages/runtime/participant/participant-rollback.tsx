import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { participantRollbackI18n } from './participant-rollback.i18n';

/** 提交图的语言配置 */
export type ParticipantRollbackProps = Readonly<{ lang?: Lang }>;
/** 展示外部状态提交的阶段关系 */
const ParticipantRollback: FC<ParticipantRollbackProps> = props => {
  const { lang = 'zh' } = props;
  const text = participantRollbackI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="participant-rollback" kind="linear" direction="right" align="center">
        <FlowEntities
          items={[
            { id: 'participant-rollback-prepared', text: text.prepared, role: 'state' },
            { id: 'participant-rollback-a', text: text.a, role: 'activity' },
            { id: 'participant-rollback-b', text: text.b, role: 'activity' },
            { id: 'participant-rollback-rollback', text: text.rollback, role: 'activity' },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'participant-rollback-prepared', target: 'participant-rollback-a' },
          { source: 'participant-rollback-a', target: 'participant-rollback-b' },
          { source: 'participant-rollback-b', target: 'participant-rollback-rollback' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default ParticipantRollback;

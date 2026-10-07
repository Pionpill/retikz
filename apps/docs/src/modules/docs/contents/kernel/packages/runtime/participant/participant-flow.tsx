import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { participantFlowI18n } from './participant-flow.i18n';

/** 提交图的语言配置 */
export type ParticipantFlowProps = Readonly<{ lang?: Lang }>;
/** 展示外部状态提交的阶段关系 */
const ParticipantFlow: FC<ParticipantFlowProps> = props => {
  const { lang = 'zh' } = props;
  const text = participantFlowI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="participant-flow" kind="linear" direction="right" align="center">
        <FlowEntities
          items={[
            { id: 'participant-flow-prepare', text: text.prepare, role: 'activity' },
            { id: 'participant-flow-commit', text: text.commit, role: 'activity' },
            { id: 'participant-flow-read', text: text.read, role: 'activity' },
            { id: 'participant-flow-publish', text: text.publish, role: 'state' },
            { id: 'participant-flow-dispose', text: text.dispose, role: 'activity' },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'participant-flow-prepare', target: 'participant-flow-commit' },
          { source: 'participant-flow-commit', target: 'participant-flow-read' },
          { source: 'participant-flow-read', target: 'participant-flow-publish' },
          { source: 'participant-flow-publish', target: 'participant-flow-dispose' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default ParticipantFlow;

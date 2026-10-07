import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { participantVanillaI18n } from './participant-vanilla.i18n';

/** Vanilla 参与者流程图的语言配置 */
export type ParticipantVanillaProps = Readonly<{ lang?: Lang }>;

/** 展示 Core 候选结果、参与者提交与发布后的下游读取 */
const ParticipantVanilla: FC<ParticipantVanillaProps> = props => {
  const { lang = 'zh' } = props;
  const text = participantVanillaI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="participant-vanilla" kind="linear" direction="right" align="center">
        <FlowLayout id="vanilla-input" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'vanilla-update', text: text.update, role: 'activity' },
              { id: 'vanilla-core', text: text.core, role: 'state' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="vanilla-participants" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'vanilla-result', text: text.result, role: 'activity' },
              { id: 'vanilla-renderer', text: text.renderer, role: 'activity' },
            ]}
          />
        </FlowLayout>
        <FlowEntities
          items={[{ id: 'vanilla-publish', text: text.publish, role: 'activity', kind: 'docs.logic.important' }]}
        />
        <FlowLayout id="vanilla-reads" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'vanilla-processing-read', text: text.processingRead, role: 'state' },
              { id: 'vanilla-render-read', text: text.renderRead, role: 'state' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'vanilla-update', target: 'vanilla-core' },
          { source: 'vanilla-core', target: 'vanilla-result' },
          { source: 'vanilla-core', target: 'vanilla-renderer' },
          { source: 'vanilla-result', target: 'vanilla-publish' },
          { source: 'vanilla-renderer', target: 'vanilla-publish' },
          { source: 'vanilla-publish', target: 'vanilla-processing-read' },
          { source: 'vanilla-publish', target: 'vanilla-render-read' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default ParticipantVanilla;

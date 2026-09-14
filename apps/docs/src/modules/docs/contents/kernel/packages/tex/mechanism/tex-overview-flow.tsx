import type { FC } from 'react';

import { FlowEntities, FlowRelations } from '@retikz/diagram-react/flow';

import type { Lang } from '@/i18n';

import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { texOverviewFlowI18n } from './tex-overview-flow.i18n';

export type TexOverviewFlowProps = Readonly<{ lang?: Lang }>;

const TexOverviewFlow: FC<TexOverviewFlowProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = texOverviewFlowI18n[lang];
  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      layout={{ direction: 'right' }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowEntities
        items={[
          { id: 'recognize', text: i18n.recognize, role: 'activity' },
          { id: 'typeset', text: i18n.typeset, role: 'activity' },
          { id: 'convert', text: i18n.convert, role: 'activity' },
          { id: 'emit', text: i18n.emit, role: 'activity' },
        ]}
      />
      <FlowRelations
        items={[
          { source: 'recognize', target: 'typeset' },
          { source: 'typeset', target: 'convert' },
          { source: 'convert', target: 'emit' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default TexOverviewFlow;

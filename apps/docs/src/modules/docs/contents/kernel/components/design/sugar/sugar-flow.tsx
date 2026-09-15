import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { sugarFlowI18n } from './sugar-flow.i18n';

export type SugarFlowProps = { lang?: Lang };
const Demo: FC<SugarFlowProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = sugarFlowI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="sugar-flow" kind="linear" direction="right" gap={110}>
        <FlowEntities
          items={[
            { id: 'input', text: i18n.input, role: 'activity' },
            { id: 'process', text: i18n.process, role: 'activity' },
            { id: 'output', text: i18n.output, role: 'activity' },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'input', target: 'process', label: i18n.expand },
          { source: 'process', target: 'output', label: i18n.compile },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default Demo;

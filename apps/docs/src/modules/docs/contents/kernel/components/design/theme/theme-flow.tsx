import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { themeFlowI18n } from './theme-flow.i18n';

export type ThemeFlowProps = { lang?: Lang };
const Demo: FC<ThemeFlowProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = themeFlowI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="theme-flow" kind="linear" direction="right" gap={30}>
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
          { source: 'input', target: 'process' },
          { source: 'process', target: 'output' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default Demo;

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { themeResolutionI18n } from './theme-resolution.i18n';

export type ThemeResolutionProps = { lang?: Lang };
const Demo: FC<ThemeResolutionProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = themeResolutionI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="theme-flow" kind="linear" direction="down" gap={30}>
        <FlowEntities
          items={[
            { id: 'input', text: i18n.input, role: 'activity' },
            { id: 'process', text: i18n.process, role: 'activity' },
            { id: 'output', text: i18n.output, role: 'activity' },
            { id: 'scene', text: i18n.scene, role: 'activity' },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'input', target: 'process' },
          { source: 'process', target: 'output' },
          { source: 'output', target: 'scene' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default Demo;

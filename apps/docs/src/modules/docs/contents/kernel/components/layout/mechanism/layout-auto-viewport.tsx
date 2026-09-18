import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { layoutAutoViewportI18n } from './layout-auto-viewport.i18n';

export type LayoutAutoViewportProps = Readonly<{ lang?: Lang }>;

const LayoutAutoViewport: FC<LayoutAutoViewportProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = layoutAutoViewportI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout kind="grid" id="layout-auto-viewport" placements={[['bounds', 'padding', 'viewport']]}>
        <FlowEntities
          items={[
            {
              id: 'bounds',
              role: 'state',
              text: [{ text: i18n.bounds }, { text: i18n.boundsNote, fill: 'gray', font: { size: 12 } }],
            },
            {
              id: 'padding',
              role: 'activity',
              kind: LogicFigureEntityKind.Important,
              text: [{ text: i18n.padding }, { text: i18n.paddingNote, fill: 'gray', font: { size: 12 } }],
            },
            {
              id: 'viewport',
              role: 'state',
              kind: LogicFigureEntityKind.ImportantData,
              text: [{ text: i18n.viewport }, { text: i18n.viewportNote, fill: 'gray', font: { size: 12 } }],
            },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'bounds', target: 'padding' },
          { source: 'padding', target: 'viewport' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default LayoutAutoViewport;

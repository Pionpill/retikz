import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { layoutViewboxResolutionI18n } from './layout-viewbox-resolution.i18n';

export type LayoutViewboxResolutionProps = Readonly<{ lang?: Lang }>;

const LayoutViewboxResolution: FC<LayoutViewboxResolutionProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = layoutViewboxResolutionI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        kind="grid"
        id="viewport"
        placements={[
          ['selection', 'range'],
          ['sizing', 'display'],
        ]}
      >
        <FlowEntities
          items={[
            {
              id: 'selection',
              role: 'state',
              kind: LogicFigureEntityKind.ImportantData,
              text: [{ text: i18n.select }, { text: i18n.priority, fill: 'gray', font: { size: 12 } }],
            },
            {
              id: 'range',
              role: 'activity',
              kind: LogicFigureEntityKind.Important,
              text: [{ text: i18n.range }, { text: i18n.automatic, fill: 'gray', font: { size: 12 } }],
            },
            {
              id: 'sizing',
              role: 'state',
              text: [{ text: i18n.size }, { text: i18n.sizing, fill: 'gray', font: { size: 12 } }],
            },
            {
              id: 'display',
              role: 'activity',
              text: [{ text: i18n.display }, { text: i18n.independent, fill: 'gray', font: { size: 12 } }],
            },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'selection', target: 'range' },
          { source: 'range', target: 'display' },
          { source: 'sizing', target: 'display' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default LayoutViewboxResolution;

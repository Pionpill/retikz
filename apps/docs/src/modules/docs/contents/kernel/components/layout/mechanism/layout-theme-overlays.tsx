import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { layoutThemeOverlaysI18n } from './layout-theme-overlays.i18n';

export type LayoutThemeOverlaysProps = Readonly<{ lang?: Lang }>;

const LayoutThemeOverlays: FC<LayoutThemeOverlaysProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = layoutThemeOverlaysI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout kind="grid" id="layout-theme-overlays" placements={[['layers', 'merge', 'theme']]}>
        <FlowEntities
          items={[
            {
              id: 'layers',
              role: 'state',
              text: [{ text: i18n.layers }, { text: i18n.layersNote, fill: 'gray', font: { size: 12 } }],
            },
            {
              id: 'merge',
              role: 'activity',
              kind: LogicFigureEntityKind.Important,
              text: [{ text: i18n.merge }, { text: i18n.mergeNote, fill: 'gray', font: { size: 12 } }],
            },
            {
              id: 'theme',
              role: 'state',
              kind: LogicFigureEntityKind.ImportantData,
              text: [{ text: i18n.theme }, { text: i18n.themeNote, fill: 'gray', font: { size: 12 } }],
            },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'layers', target: 'merge' },
          { source: 'merge', target: 'theme' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default LayoutThemeOverlays;

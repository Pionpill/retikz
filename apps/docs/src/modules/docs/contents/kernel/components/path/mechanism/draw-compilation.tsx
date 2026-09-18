import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { drawCompilationI18n } from './draw-compilation.i18n';

export type DrawCompilationProps = Readonly<{ lang?: Lang }>;

const DrawCompilation: FC<DrawCompilationProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = drawCompilationI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout kind="grid" id="draw-compilation" placements={[['input', 'normalize', 'geometry', 'output']]}>
        <FlowEntities
          items={[
            {
              id: 'input',
              role: 'state',
              text: [{ text: i18n.input }, { text: 'way / Step', fill: 'gray', font: { size: 12 } }],
            },
            {
              id: 'normalize',
              role: 'activity',
              text: [{ text: i18n.normalize }, { text: 'normalizePath', fill: 'gray', font: { size: 12 } }],
            },
            {
              id: 'geometry',
              role: 'activity',
              text: [{ text: i18n.geometry }, { text: 'PathCommand', fill: 'gray', font: { size: 12 } }],
            },
            {
              id: 'output',
              role: 'state',
              text: [{ text: i18n.output }, { text: 'Scene', fill: 'gray', font: { size: 12 } }],
            },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'input', target: 'normalize' },
          { source: 'normalize', target: 'geometry' },
          { source: 'geometry', target: 'output' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default DrawCompilation;

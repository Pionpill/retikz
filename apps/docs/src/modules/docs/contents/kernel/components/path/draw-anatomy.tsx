import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { drawAnatomyI18n } from './draw-anatomy.i18n';
/** 绘制关系图的语言 */
export type DrawAnatomyProps = Readonly<{ lang?: Lang }>;
/** 简写、路径动作与装饰的职责关系 */
const DrawAnatomy: FC<DrawAnatomyProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = drawAnatomyI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        kind="grid"
        id="draw-anatomy"
        placements={[
          ['way', 'draw', 'path'],
          ['step', 'arrow', 'label'],
        ]}
      >
        <FlowEntities
          items={[
            { id: 'way', role: 'state', text: i18n.way },
            { id: 'draw', role: 'activity', text: i18n.draw },
            { id: 'path', role: 'state', text: i18n.path },
            { id: 'step', role: 'state', text: i18n.step },
            { id: 'arrow', role: 'state', text: i18n.arrow },
            { id: 'label', role: 'state', text: i18n.label },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'way', target: 'draw' },
          { source: 'draw', target: 'path' },
          { source: 'step', target: 'path' },
          { source: 'arrow', target: 'path' },
          { source: 'label', target: 'path' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default DrawAnatomy;

import type { FlowDiagramProps } from '@retikz/diagram-react/flow';
import { FlowEntities, FlowRelations } from '@retikz/diagram-react/flow';
import type { ReactElement } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import type { previewControls } from './flow-bend.controls';
import { flowBendI18n } from './flow-bend.i18n';
import { createObstacleLayout } from './obstacle-layout';

/** 固定节点，观察有限候选选择及标签沿曲线的放置 */
export const renderFlowBendPreview = (
  values: PreviewControlValuesFor<typeof previewControls>,
  lang: Lang = 'zh',
): ReactElement<FlowDiagramProps> => {
  const copy = flowBendI18n[lang];
  return (
    <PreviewFlowDiagram
      flowLayouts={[createObstacleLayout(values.obstacleX, values.obstacleY, false)]}
      defaultFlowLayout="obstacle-playground"
      viewBox={{ x: -24, y: -24, width: 520, height: 300 }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowEntities
        items={[
          { id: 'a', text: copy.source, role: 'activity', layout: { width: 96 } },
          { id: 'obstacle', text: copy.obstacle, layout: { width: 120 } },
          { id: 'b', text: copy.target, role: 'activity', layout: { width: 96 } },
        ]}
      />

      <FlowRelations
        items={[
          {
            source: 'a',
            target: 'b',
            routing: { kind: 'bend', ...(values.autoAngle ? {} : { bendAngle: values.angle }) },
            label: {
              text: copy.text,
              position: values.position,
              sloped: values.sloped,
              interrupt: values.interrupt,
              gap: 4,
              distance: 4,
              font: { size: 14 },
            },
          },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

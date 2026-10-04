import type { FlowDiagramProps } from '@retikz/diagram-react/flow';
import { FlowEntities, FlowRelations } from '@retikz/diagram-react/flow';
import type { ReactElement } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import type { previewControls } from './flow-orthogonal.controls';
import { flowOrthogonalI18n } from './flow-orthogonal.i18n';
import { createObstacleLayout } from './obstacle-layout';
/** 固定矩形起终点，移动椭圆障碍观察自动选路 */
export const renderFlowOrthogonalPreview = (
  values: PreviewControlValuesFor<typeof previewControls>,
  lang: Lang = 'zh',
): ReactElement<FlowDiagramProps> => {
  const copy = flowOrthogonalI18n[lang];
  return (
    <PreviewFlowDiagram
      flowLayouts={[createObstacleLayout(values.obstacleX, values.obstacleY, true)]}
      defaultFlowLayout="obstacle-playground"
      layout={{ direction: 'right' }}
      viewBox={{ x: -8, y: -16, width: 560, height: 240 }}
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
            routing: {
              kind: 'orthogonal',
              cornerRadius: 8,
              ...(values.turnPosition === 'auto'
                ? {}
                : {
                    turnPosition: values.turnPosition === '0.25' ? 0.25 : values.turnPosition === '0.75' ? 0.75 : 0.5,
                  }),
            },
          },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

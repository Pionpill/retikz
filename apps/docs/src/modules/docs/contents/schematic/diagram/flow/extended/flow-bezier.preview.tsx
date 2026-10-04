import type { FlowDiagramProps } from '@retikz/diagram-react/flow';
import { FlowEntities, FlowRelations } from '@retikz/diagram-react/flow';
import type { IRFlowRouting } from '@retikz/diagram/flow';
import type { ReactElement } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import type { previewControls } from './flow-bezier.controls';
import { flowBezierI18n } from './flow-bezier.i18n';
import { createObstacleLayout } from './obstacle-layout';
/** 固定节点，比较自动候选与作者指定的控制点 */
export const renderFlowBezierPreview = (
  values: PreviewControlValuesFor<typeof previewControls>,
  lang: Lang = 'zh',
): ReactElement<FlowDiagramProps> => {
  const copy = flowBezierI18n[lang];
  const routing: IRFlowRouting =
    values.kind === 'curve'
      ? values.automatic
        ? { kind: 'curve' }
        : { kind: 'curve', control: [values.x1, values.y1] }
      : values.automatic
        ? { kind: 'cubic' }
        : { kind: 'cubic', control1: [values.x1, values.y1], control2: [values.x2, values.y2] };
  return (
    <PreviewFlowDiagram
      flowLayouts={[createObstacleLayout(values.obstacleX, values.obstacleY, false)]}
      defaultFlowLayout="obstacle-playground"
      viewBox={{ x: -24, y: -24, width: 540, height: 330 }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowEntities
        items={[
          { id: 'a', text: copy.source, role: 'activity', layout: { width: 96 } },
          { id: 'obstacle', text: copy.obstacle, layout: { width: 120 } },
          { id: 'b', text: copy.target, role: 'activity', layout: { width: 96 } },
        ]}
      />

      <FlowRelations items={[{ source: 'a', target: 'b', routing, label: copy.label }]} />
    </PreviewFlowDiagram>
  );
};

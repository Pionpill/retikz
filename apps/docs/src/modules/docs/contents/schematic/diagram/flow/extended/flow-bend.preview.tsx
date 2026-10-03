import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { ReactElement } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import type { previewControls } from './flow-bend.controls';
import { flowBendI18n } from './flow-bend.i18n';

/** 固定节点，观察有限候选选择及标签沿曲线的放置 */
export const renderFlowBendPreview = (
  values: PreviewControlValuesFor<typeof previewControls>,
  lang: Lang = 'zh',
): ReactElement => {
  const copy = flowBendI18n[lang];
  return (
    <PreviewFlowDiagram viewBox={{ x: -24, y: -24, width: 560, height: 360 }}>
      <FlowLayout id="row" kind="linear" direction="right" gap={48}>
        <FlowEntities
          items={[
            { id: 'a', text: copy.source },
            { id: 'obstacle', text: copy.obstacle },
            { id: 'b', text: copy.target },
          ]}
        />
      </FlowLayout>
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
              gap: values.gap,
              distance: values.distance,
              font: { size: values.fontSize },
            },
          },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

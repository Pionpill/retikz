import type { FlowDiagramProps } from '@retikz/diagram-react/flow';
import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { ReactElement } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import type { previewControls } from './flow-smooth.controls';
import { flowSmoothI18n } from './flow-smooth.i18n';

/** 同一组节点下观察经过点位置与 tension 的独立作用 */
export const renderFlowSmoothPreview = (
  values: PreviewControlValuesFor<typeof previewControls>,
  lang: Lang = 'zh',
): ReactElement<FlowDiagramProps> => {
  const copy = flowSmoothI18n[lang];
  return (
    <PreviewFlowDiagram
      viewBox={{ x: -24, y: -24, width: 540, height: 330 }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout id="row" kind="linear" direction="right" gap={36} itemWidth={120}>
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
            routing: {
              kind: 'smooth',
              points:
                values.count === 1
                  ? [{ of: 'obstacle', offset: [0, -values.height] }]
                  : [
                      { of: 'a', offset: [45, -values.height] },
                      ...(values.count === 3
                        ? [{ of: 'obstacle', offset: [0, -values.height] satisfies [number, number] }]
                        : []),
                      { of: 'b', offset: [-45, -values.height] },
                    ],
              tension: values.tension,
            },
            label: { text: copy.label, sloped: true, position: 0.6 },
          },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

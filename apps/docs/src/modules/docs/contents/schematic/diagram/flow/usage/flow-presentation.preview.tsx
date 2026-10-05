import { FlowEntities, FlowRelations } from '@retikz/diagram-react/flow';
import { LegendSchema } from '@retikz/standard/presentation';
import type { ReactElement } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import type { previewControls } from './flow-presentation.controls';
import { flowPresentationI18n } from './flow-presentation.i18n';

/** 通过透明度独立隐藏说明区域，保持布局和取景稳定 */
export const renderFlowPresentationPreview = (
  values: PreviewControlValuesFor<typeof previewControls>,
  lang: Lang,
): ReactElement => {
  const copy = flowPresentationI18n[lang];
  return (
    <PreviewFlowDiagram
      viewBox={{ x: -24, y: -24, width: 360, height: 260 }}
      style={{ maxWidth: '100%', height: 'auto' }}
      frame={{ legendPosition: 'bottom' }}
      presentation={{
        title: { text: copy.heading, style: { opacity: values.title ? 1 : 0 } },
        description: { text: copy.summary, style: { opacity: values.description ? 1 : 0 } },
        legend: LegendSchema.parse({
          namespace: 'standard',
          type: 'legend',
          style: { opacity: values.legend ? 1 : 0 },
          content: {
            kind: 'items',
            items: [
              {
                key: 'step',
                sample: {
                  type: 'node',
                  shape: 'rectangle',
                  cornerRadius: 6,
                  layout: { minimumSize: { width: 24, height: 18 } },
                },
                label: { type: 'node', text: copy.step, style: { stroke: 'none', fill: 'none' } },
              },
            ],
          },
        }),
      }}
    >
      <FlowEntities
        items={[
          { id: 'validate', text: copy.start, role: 'activity' },
          { id: 'save', text: copy.end, role: 'activity' },
        ]}
      />
      <FlowRelations items={[['validate', 'save']]} />
    </PreviewFlowDiagram>
  );
};

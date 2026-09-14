import type { FC } from 'react';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';

import type { Lang } from '@/i18n';

import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';

import { flowBoundsI18n } from './flow-bounds.i18n';

export type FlowBoundsProps = Readonly<{ lang?: Lang }>;

const Demo: FC<FlowBoundsProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = flowBoundsI18n[lang];
  return (
    <PreviewFlowDiagram routing={{ kind: 'straight' }}>
      <FlowLayout id="outputs" kind="linear" direction="down" gap={24}>
        <FlowEntities items={[{ id: 'svg', text: i18n.svg, role: 'activity' }]} />
        <FlowLayout id="canvas-output" kind="linear" direction="right" gap={32} excludeFromBounds={['formats']}>
          <FlowEntities items={[{ id: 'canvas', text: i18n.canvas, role: 'activity' }]} />
          <FlowLayout id="formats" kind="linear" direction="down" gap={12}>
            <FlowEntities
              items={[
                { id: 'png', text: 'PNG', role: 'activity' },
                { id: 'jpeg', text: 'JPEG', role: 'activity' },
              ]}
            />
          </FlowLayout>
        </FlowLayout>
      </FlowLayout>
      <FlowRelations items={['png', 'jpeg'].map(target => ({ source: 'canvas', target }))} />
    </PreviewFlowDiagram>
  );
};

export default Demo;

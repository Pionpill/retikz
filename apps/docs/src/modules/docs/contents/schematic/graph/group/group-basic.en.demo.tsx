import type { FC } from 'react';

import { Entity, Graph, Group, Relation } from '@retikz/graph-react';

import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { groupCaptionControls, previewControlContract } from './group-caption.en.controls';

export const previewControls = groupCaptionControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const side = values.side === 'bottom' ? 'bottom' : 'top';
  const direction = values.direction === 'vertical' ? 'vertical' : 'horizontal';
  const itemGap = typeof values.itemGap === 'number' ? values.itemGap : 4;
  const bodyGap = typeof values.bodyGap === 'number' ? values.bodyGap : 4;

  return (
    <Graph width={320} height={150} viewBox={{ x: -50, y: -36.6, width: 320, height: 150 }}>
      <Group
        id="runtime"
        caption={{
          side,
          direction,
          itemGap,
          bodyGap,
          title: { text: 'Runtime' },
          description: { text: 'Compile and render' },
        }}
      >
        <Entity id="compiler" role="activity" position={[90, 110]} textColor="currentColor">
          Compile
        </Entity>
        <Entity id="renderer" role="participant" position={[230, 110]} textColor="currentColor">
          Renderer
        </Entity>
        <Relation role="flow" source={{ id: 'compiler' }} target={{ id: 'renderer' }} />
      </Group>
    </Graph>
  );
});

export const previewSource = withGraphPreviewSource(controlledPreview.source);

/** Group caption arrangement controls demo */
const Demo: FC = controlledPreview.Component;

export default Demo;

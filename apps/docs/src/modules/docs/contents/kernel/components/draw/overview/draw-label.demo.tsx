import type { WayDSL } from '@retikz/core';
import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { drawLabelControls, previewControlContract } from './draw-label.controls';

export const previewControls = drawLabelControls;

type DrawLabelValues = PreviewControlValuesFor<typeof drawLabelControls>;

/** 把标注面板值转换为 Draw way */
const wayOf = (values: DrawLabelValues): WayDSL => {
  const label = {
    text: `t = ${values.position.toFixed(2)}`,
    position: values.position,
    side: values.side,
    sloped: values.sloped,
    textColor: values.textColor,
  } as const;
  return values.segmentKind === 'line' ? ['A', { label }, 'B'] : ['A', { label }, values.segmentKind, 'B'];
};

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Layout width={400} height={218} viewBox={{ x: -40, y: -120, width: 440, height: 240 }}>
      <Node id="A" position={[0, -60]} stroke="gray" dashed>
        a
      </Node>
      <Node id="B" position={[360, 60]} stroke="gray" dashed>
        b
      </Node>
      <Draw way={wayOf(values)} arrow="->" />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** Draw 边标注 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;

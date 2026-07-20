import type { FC } from 'react';

import { EdgeLabel, Layout, Node, Path, Step } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { stepLabelControls } from './step-label.controls';

export const previewControls = stepLabelControls;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/** Step label prop 与 EdgeLabel sugar 的等价 playground */
const Demo: FC = () => {
  const values = usePreviewControls(stepLabelControls);
  const label = {
    text: 'prop',
    position: values.position,
    side: values.side,
    sloped: values.sloped,
    textColor: values.textColor,
  } as const;

  return (
    <Layout width={400} height={218} viewBox={{ x: -40, y: -120, width: 440, height: 240 }}>
      <Node id="A" position={[0, -60]} stroke="gray" dashed>
        a
      </Node>
      <Node id="B" position={[360, -15]} stroke="gray" dashed>
        b
      </Node>
      <Node id="C" position={[0, 45]} stroke="gray" dashed>
        c
      </Node>
      <Node id="D" position={[360, 90]} stroke="gray" dashed>
        d
      </Node>
      <Path arrow="->">
        <Step kind="move" to="A" />
        <Step to="B" label={label} />
      </Path>
      <Path arrow="->" color={values.textColor}>
        <Step kind="move" to="C" />
        <Step to="D">
          <EdgeLabel position={values.position} side={values.side} sloped={values.sloped}>
            sugar
          </EdgeLabel>
        </Step>
      </Path>
    </Layout>
  );
};

export default Demo;

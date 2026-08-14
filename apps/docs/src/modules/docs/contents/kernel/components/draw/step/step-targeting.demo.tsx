import type { FC, ReactNode } from 'react';

import { Layout, Node, Path, Step } from '@retikz/react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, stepTargetingControls } from './step-targeting.controls';

export const previewControls = stepTargetingControls;

type StepTargetingValues = PreviewControlValuesFor<typeof stepTargetingControls>;

/** 渲染选中的 Step target 形态 */
const targetsOf = (values: StepTargetingValues): ReactNode => {
  const offset: [number, number] = [values.offsetX, values.offsetY];
  switch (values.targetKind) {
    case 'offset':
      return (
        <>
          <Step to={{ of: 'A', offset }} />
          <Step to={{ of: 'A', offset: [values.offsetX * 2, values.offsetY * 2] }} />
        </>
      );
    case 'relative':
      return (
        <>
          <Step to={{ relative: offset }} />
          <Step to={{ relative: [values.offsetX * 2, values.offsetY * 2] }} />
        </>
      );
    case 'relativeAccumulate':
      return (
        <>
          <Step to={{ relativeAccumulate: offset }} />
          <Step to={{ relativeAccumulate: offset }} />
        </>
      );
  }
};

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Layout width={400} height={229} viewBox={{ x: -190, y: -120, width: 380, height: 240 }}>
      <Node id="A" position={[-100, 40]} stroke="gray" dashed>
        a
      </Node>
      <Path arrow="->">
        <Step kind="move" to="A" />
        {targetsOf(values)}
      </Path>
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** Step offset / relative / relativeAccumulate playground */
const Demo: FC = controlledPreview.Component;

export default Demo;

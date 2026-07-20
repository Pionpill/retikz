import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { wayCycleControls } from './way-cycle.controls';
import { WayCyclePresentationByState } from './way-cycle.data';

export const previewControls = wayCycleControls;

export const previewSource = { deriveIR: false } satisfies PreviewSourceConfig;

/** 在固定三点路径上切换 DrawWay.Cycle */
const Demo: FC = () => {
  const values = usePreviewControls(wayCycleControls);
  const presentation = WayCyclePresentationByState[values.state];

  return (
    <Layout
      width={400}
      height={220}
      viewBox={{ x: -170, y: -110, width: 340, height: 220 }}
      nodeDefault={{ stroke: 'gray', dashed: true }}
    >
      <Node id="A" position={[-80, 45]}>
        a
      </Node>
      <Node id="B" position={[0, -55]}>
        b
      </Node>
      <Node id="C" position={[80, 45]}>
        c
      </Node>
      {presentation.showClosingGuide && (
        <Draw way={['C.center', 'A.center']} stroke="gray" dashPattern={[1, 4]} lineCap="round" />
      )}
      <Draw way={presentation.way} stroke="dodgerblue" strokeWidth={2} fill={presentation.fill} fillOpacity={0.16} />
    </Layout>
  );
};

export default Demo;

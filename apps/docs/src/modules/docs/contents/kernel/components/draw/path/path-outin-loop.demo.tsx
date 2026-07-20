import type { FC } from 'react';

import { Draw, Layout, Node, Path, Step } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { pathOutInLoopControls } from './path-outin-loop.controls';

export const previewControls = pathOutInLoopControls;

export const previewSource = { deriveIR: false } satisfies PreviewSourceConfig;

const Start: [number, number] = [-90, 0];
const End: [number, number] = [90, 0];

/** 从指定点沿角度生成辅助线终点 */
const guideEnd = (origin: [number, number], angle: number, length: number): [number, number] => {
  const radians = (angle * Math.PI) / 180;
  return [origin[0] + Math.cos(radians) * length, origin[1] + Math.sin(radians) * length];
};

/**
 * out/in 出入射角与自环 playground
 */
const Demo: FC = () => {
  const values = usePreviewControls(pathOutInLoopControls);
  const target = values.mode === 'loop' ? 'S' : 'T';
  const incomingOrigin = values.mode === 'loop' ? Start : End;
  const looseness = values.mode === 'loop' ? values.loopLooseness : values.looseness;
  const guideLength = values.mode === 'loop' ? values.loopLooseness : 60 * values.looseness;

  return (
    <Layout
      width={360}
      height={220}
      viewBox={{ x: -180, y: -110, width: 360, height: 220 }}
      nodeDefault={{ stroke: 'gray', dashed: true }}
    >
      <Draw
        way={[Start, guideEnd(Start, values.outAngle, guideLength)]}
        stroke="#94a3b8"
        dashPattern={[1, 4]}
        lineCap="round"
      />
      <Draw
        way={[incomingOrigin, guideEnd(incomingOrigin, values.inAngle, guideLength)]}
        stroke="#94a3b8"
        dashPattern={[1, 4]}
        lineCap="round"
      />
      <Node id="S" position={Start} shape="circle">
        S
      </Node>
      <Node id="T" position={End} shape="circle">
        T
      </Node>
      <Path arrow="->" stroke="currentColor">
        <Step kind="move" to="S" />
        <Step kind="bend" to={target} outAngle={values.outAngle} inAngle={values.inAngle} looseness={looseness} />
      </Path>
    </Layout>
  );
};

export default Demo;

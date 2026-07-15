import type { FC } from 'react';

import { point, vector2 } from '@retikz/core';
import { Draw, Layout, Node } from '@retikz/react';

const ORIGIN: [number, number] = [-60, -30];
const VECTOR_END: [number, number] = [90, -90];
const VECTOR = point.sub(VECTOR_END, ORIGIN);
const NORMAL_END = point.add(ORIGIN, vector2.normal(VECTOR));

/** 向量与左手法向量的正交关系示意。 */
const Demo: FC = () => (
  <Layout
    width={520}
    height={300}
    viewBox={{ x: -180, y: -125, width: 350, height: 270 }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <Draw
      way={[
        [-165, -30],
        [155, -30],
      ]}
      stroke="lightgray"
    />
    <Draw
      way={[
        [-60, -115],
        [-60, 135],
      ]}
      stroke="lightgray"
    />

    <Draw way={[ORIGIN, VECTOR_END]} arrow="->" stroke="darkorange" strokeWidth={2} />
    <Draw way={[ORIGIN, NORMAL_END]} arrow="->" stroke="dodgerblue" strokeWidth={2} />

    <Node position={ORIGIN} shape="circle" minimumSize={7} padding={0} fill="currentColor" stroke="none" />
    <Node position={[105, -102]} stroke="none" textColor="darkorange">
      v
    </Node>
    <Node position={[18, 124]} stroke="none" textColor="dodgerblue">
      normal(v)
    </Node>
    <Node position={[64, 54]} stroke="none" textColor="gray" font={{ size: 12 }}>
      dot(v, normal(v)) = 0
    </Node>
  </Layout>
);

export default Demo;

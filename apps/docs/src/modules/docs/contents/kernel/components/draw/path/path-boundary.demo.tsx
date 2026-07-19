import type { FC } from 'react';

import { Circle, Draw, Layout, Node } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { pathBoundaryControls } from './path-boundary.controls';

export const previewControls = pathBoundaryControls;

export const previewSource = { deriveIR: false } satisfies PreviewSourceConfig;

const StarOuterRadius = 50;
const StarAabbHalfWidth = StarOuterRadius * Math.cos(Math.PI / 10);
const CircleBoundaryRadius = Math.hypot(StarAabbHalfWidth, StarOuterRadius);

/**
 * 端点 boundary：单边覆盖
 * @description 固定一条边，在面板切换目标端点使用星形轮廓或外接圆连接面
 */
const Demo: FC = () => {
  const values = usePreviewControls(pathBoundaryControls);

  return (
    <Layout
      width={360}
      height={220}
      viewBox={{ x: -180, y: -110, width: 360, height: 220 }}
      nodeDefault={{ stroke: 'gray', dashed: true }}
    >
      <Circle
        center={[0, 0]}
        radius={CircleBoundaryRadius}
        stroke="#94a3b8"
        fill="none"
        dashPattern={[1, 4]}
        lineCap="round"
      />
      <Node
        id="star"
        position={[0, 0]}
        shape={{ type: 'star', params: { points: 5, innerRadius: 20, outerRadius: StarOuterRadius } }}
        fill="gold"
        stroke="none"
      />
      <Node id="A" position={[-130, 80]}>
        a
      </Node>
      <Draw way={['A', { id: 'star', boundary: values.boundary }]} arrow="->" />
    </Layout>
  );
};

export default Demo;

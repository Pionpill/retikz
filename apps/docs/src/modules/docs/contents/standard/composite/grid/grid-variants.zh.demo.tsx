import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { Grid } from '@retikz/standard-react';

/** Grid 常见语义变体的中文并列对比 */
const Demo: FC = () => (
  <Layout width={760} height={145} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node position={[95, 18]} stroke="none" fill="none" padding={0} font={{ size: 12 }}>
      分轴间距
    </Node>
    <Grid
      bounds={{ start: [18, 42], end: [172, 122] }}
      line={{
        vertical: { spacing: 20, includeBoundary: true, style: { stroke: 'lightgray' } },
        horizontal: { spacing: 14, includeBoundary: true, style: { stroke: 'lightgray' } },
      }}
    />

    <Node position={[285, 18]} stroke="none" fill="none" padding={0} font={{ size: 12 }}>
      中心加尺寸
    </Node>
    <Grid
      bounds={{ position: [285, 82], width: 154, height: 80 }}
      line={{ spacing: 18, origin: 0, includeBoundary: true, style: { stroke: 'lightgray' } }}
    />

    <Node position={[475, 18]} stroke="none" fill="none" padding={0} font={{ size: 12 }}>
      普通线与主线
    </Node>
    <Grid
      bounds={{ start: [398, 42], end: [552, 122] }}
      line={{
        spacing: 12,
        includeBoundary: true,
        style: { stroke: 'lightgray' },
        major: { every: 3, style: { stroke: 'gray', strokeWidth: 1.5 } },
      }}
    />

    <Node position={[665, 18]} stroke="none" fill="none" padding={0} font={{ size: 12 }}>
      反向角点与外框
    </Node>
    <Grid
      bounds={{ start: [742, 122], end: [588, 42] }}
      line={{
        vertical: { spacing: 20, origin: 600, includeBoundary: true, style: { stroke: 'lightgray' } },
        horizontal: { spacing: 20, origin: 60, includeBoundary: true, style: { stroke: 'lightgray' } },
      }}
      border={{ padding: 4, order: 'behind', extendLines: true, style: { stroke: 'gray' } }}
    />
  </Layout>
);

export default Demo;

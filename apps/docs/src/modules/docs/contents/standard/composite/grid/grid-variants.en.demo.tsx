import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { Grid } from '@retikz/standard-react';

/** Grid 常见语义变体的英文并列对比 */
const Demo: FC = () => (
  <Layout width={760} height={145} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node position={[95, 18]} stroke="none" fill="none" padding={0} font={{ size: 12 }}>
      Axis-specific spacing
    </Node>
    <Grid
      bounds={{ min: [18, 42], max: [172, 122] }}
      spacing={{ x: 20, y: 14 }}
      lines={{ includeBoundary: true, style: { stroke: 'lightgray' } }}
    />

    <Node position={[285, 18]} stroke="none" fill="none" padding={0} font={{ size: 12 }}>
      One direction
    </Node>
    <Grid
      bounds={{ min: [208, 42], max: [362, 122] }}
      spacing={18}
      lines={{ horizontal: false, includeBoundary: true, style: { stroke: 'lightgray' } }}
    />

    <Node position={[475, 18]} stroke="none" fill="none" padding={0} font={{ size: 12 }}>
      Ordinary and major lines
    </Node>
    <Grid
      bounds={{ min: [398, 42], max: [552, 122] }}
      spacing={12}
      lines={{ includeBoundary: true, style: { stroke: 'lightgray' } }}
      major={{ every: 3, style: { stroke: 'gray', strokeWidth: 1.5 } }}
    />

    <Node position={[665, 18]} stroke="none" fill="none" padding={0} font={{ size: 12 }}>
      Alignment and border
    </Node>
    <Grid
      bounds={{ min: [588, 42], max: [742, 122] }}
      spacing={20}
      origin={[665, 82]}
      lines={{ includeBoundary: true, style: { stroke: 'lightgray' } }}
      border={{ padding: 4, order: 'behind', extendLines: true, style: { stroke: 'gray' } }}
    />
  </Layout>
);

export default Demo;

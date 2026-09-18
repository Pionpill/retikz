import { Coordinate, Draw, Layout } from '@retikz/react';
import type { FC } from 'react';

/** 两个不可见坐标点由路径连接的最小组合 */
const CoordinateIntegration: FC = () => (
  <Layout>
    <Coordinate id="start" position={[-60, 0]} />
    <Coordinate id="end" position={[60, 0]} />
    <Draw way={['start', 'end']} arrow="->" />
  </Layout>
);

export default CoordinateIntegration;

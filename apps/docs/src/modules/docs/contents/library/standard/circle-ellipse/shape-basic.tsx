import { Layout } from '@retikz/react';
import { Circle } from '@retikz/standard-react/shape';
import type { FC } from 'react';

/** 最小圆形路径示例 */
const ShapeBasic: FC = () => (
  <Layout>
    <Circle center={[0, 0]} radius={32} />
  </Layout>
);
export default ShapeBasic;

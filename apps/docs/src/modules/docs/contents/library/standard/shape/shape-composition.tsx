import { Layout } from '@retikz/react';
import { Circle, Rectangle } from '@retikz/standard-react/shape';
import type { FC } from 'react';

/** 用矩形与圆组合简单面板轮廓 */
const ShapeComposition: FC = () => (
  <Layout>
    <Rectangle center={[0, 0]} width={220} height={100} cornerRadius={12} style={{ fill: 'none' }} />
    <Circle center={[-60, 0]} radius={24} style={{ fill: 'none' }} />
    <Rectangle center={[40, 0]} width={80} height={28} cornerRadius={4} style={{ fill: 'none' }} />
  </Layout>
);

export default ShapeComposition;

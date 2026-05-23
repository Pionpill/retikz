import { Ellipse, Layout } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={300} height={150}>
    {/* 整椭圆 */}
    <Ellipse center={[80, 55]} radiusX={70} radiusY={40} stroke="#3b82f6" strokeWidth={2} />
    {/* 1/4 椭圆（带角度 → chord 闭合） */}
    <Ellipse center={[230, 55]} radiusX={60} radiusY={40} startAngle={0} endAngle={90} fill="#eee" stroke="#ef4444" strokeWidth={2} />
  </Layout>
);

export default Demo;

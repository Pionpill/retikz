import { Arc, Layout } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={300} height={150}>
    {/* 圆弧 0→90（东→南，y-down） */}
    <Arc center={[60, 30]} radius={70} startAngle={0} endAngle={90} stroke="blue" strokeWidth={2} />
    {/* 椭圆弧 */}
    <Arc center={[200, 30]} radiusX={80} radiusY={50} startAngle={0} endAngle={120} stroke="red" strokeWidth={2} />
  </Layout>
);

export default Demo;

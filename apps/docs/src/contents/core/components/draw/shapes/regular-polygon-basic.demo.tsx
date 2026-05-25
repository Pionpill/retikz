import { Layout, RegularPolygon } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={320} height={130}>
    {/* 五边形 / 六边形 / 八边形 */}
    <RegularPolygon center={[55, 65]} radius={48} sides={5} fill="dodgerblue" />
    <RegularPolygon center={[160, 65]} radius={48} sides={6} stroke="red" strokeWidth={2} />
    <RegularPolygon center={[265, 65]} radius={48} sides={8} fill="green" />
  </Layout>
);

export default Demo;

import { Layout, RegularPolygon } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={320} height={130}>
    {/* 五边形 / 六边形 / 八边形 */}
    <RegularPolygon center={[55, 65]} radius={48} sides={5} fill="#3b82f6" />
    <RegularPolygon center={[160, 65]} radius={48} sides={6} stroke="#ef4444" strokeWidth={2} />
    <RegularPolygon center={[265, 65]} radius={48} sides={8} fill="#10b981" />
  </Layout>
);

export default Demo;

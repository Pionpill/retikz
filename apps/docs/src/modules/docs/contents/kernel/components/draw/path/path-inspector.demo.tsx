import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';

/** 使用内置 Path Inspector 显示三次贝塞尔控制点 */
const Demo: FC = () => (
  <Layout width={360} height={180} viewBox={{ x: -180, y: -90, width: 360, height: 180 }}>
    <Path inspect={{ controlPoints: true, labels: true }} stroke="dodgerblue" strokeWidth={3}>
      <Step kind="move" to={[-130, 35]} />
      <Step kind="cubic" control1={[-70, -80]} control2={[75, 90]} to={[130, -30]} />
    </Path>
  </Layout>
);

export default Demo;

import { Layout, Path, Step } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={360} height={220}>
    {/* 上：opacity 整体——同时打折 stroke 与 fill */}
    <Path
      stroke="currentColor"
      fill="orange"
      strokeWidth={4}
      opacity={0.4}
    >
      <Step kind="move" to={[20, 20]} />
      <Step kind="line" to={[120, 20]} />
      <Step kind="line" to={[120, 80]} />
      <Step kind="line" to={[20, 80]} />
      <Step kind="cycle" />
    </Path>

    {/* 中：fillOpacity 只打折 fill，stroke 不变 */}
    <Path
      stroke="currentColor"
      fill="orange"
      strokeWidth={4}
      fillOpacity={0.3}
    >
      <Step kind="move" to={[140, 20]} />
      <Step kind="line" to={[240, 20]} />
      <Step kind="line" to={[240, 80]} />
      <Step kind="line" to={[140, 80]} />
      <Step kind="cycle" />
    </Path>

    {/* 下：drawOpacity 只打折 stroke，fill 不变 */}
    <Path
      stroke="currentColor"
      fill="orange"
      strokeWidth={4}
      drawOpacity={0.2}
    >
      <Step kind="move" to={[260, 20]} />
      <Step kind="line" to={[340, 20]} />
      <Step kind="line" to={[340, 80]} />
      <Step kind="line" to={[260, 80]} />
      <Step kind="cycle" />
    </Path>

    {/* 三者叠加：opacity 0.7 × fillOpacity 0.5 × drawOpacity 0.4 */}
    <Path
      stroke="currentColor"
      fill="dodgerblue"
      strokeWidth={6}
      opacity={0.7}
      fillOpacity={0.5}
      drawOpacity={0.4}
    >
      <Step kind="move" to={[80, 130]} />
      <Step kind="line" to={[280, 130]} />
      <Step kind="line" to={[280, 190]} />
      <Step kind="line" to={[80, 190]} />
      <Step kind="cycle" />
    </Path>
  </Layout>
);

export default Demo;

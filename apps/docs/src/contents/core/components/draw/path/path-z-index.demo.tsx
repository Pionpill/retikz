import { Layout, Path, Step } from '@retikz/react';
import type { FC } from 'react';

/**
 * Path zIndex 显式栈序
 * @description 两个填充矩形重叠：声明顺序蓝先红后，默认后声明的红压在上；给先声明的蓝色 path 设 zIndex={1}，把它抬到红色之上。
 */
const Demo: FC = () => (
  <Layout width={220} height={200}>
    {/* 蓝：先声明，但 zIndex=1 → 浮到上层 */}
    <Path fill="blue" stroke="blue" strokeWidth={2} zIndex={1}>
      <Step kind="move" to={[20, 20]} />
      <Step kind="line" to={[120, 20]} />
      <Step kind="line" to={[120, 120]} />
      <Step kind="line" to={[20, 120]} />
      <Step kind="cycle" />
    </Path>
    {/* 红：后声明，默认应在上，但被蓝压住 */}
    <Path fill="red" stroke="red" strokeWidth={2}>
      <Step kind="move" to={[70, 70]} />
      <Step kind="line" to={[170, 70]} />
      <Step kind="line" to={[170, 170]} />
      <Step kind="line" to={[70, 170]} />
      <Step kind="cycle" />
    </Path>
  </Layout>
);

export default Demo;

import { Draw, DrawWay, Layout } from '@retikz/react';
import type { FC } from 'react';

/**
 * Draw zIndex 显式栈序
 * @description 两个用 way + Cycle 画的填充方块重叠：声明顺序蓝先红后，默认后声明的红压上；给先声明的蓝色 Draw 设 zIndex={1} 把它抬到红色之上。与 <Path> 的 zIndex 同义（Draw 编译即 Path）。
 */
const Demo: FC = () => (
  <Layout width={220} height={200}>
    {/* 蓝：先声明，但 zIndex=1 → 浮到上层 */}
    <Draw
      way={[[20, 20], [120, 20], [120, 120], [20, 120], DrawWay.Cycle]}
      fill="teal"
      stroke="teal"
      strokeWidth={2}
      zIndex={1}
    />
    {/* 红：后声明，默认应在上，但被蓝压住 */}
    <Draw
      way={[[70, 70], [170, 70], [170, 170], [70, 170], DrawWay.Cycle]}
      fill="red"
      stroke="red"
      strokeWidth={2}
    />
  </Layout>
);

export default Demo;

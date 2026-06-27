import { Layout, Path, Step } from '@retikz/react';
import type { FC } from 'react';

/**
 * fill + cycle 画填充图形
 * @description 半透明 fill 让 stroke 仍可见；简单凸闭合路径 fillRule 与 nonzero 结果一致，ring / 8 字形才需要 evenodd。
 */
const Demo: FC = () => (
  <Layout width={360} height={160}>
    {/* 蓝色填充三角形 */}
    <Path fill="dodgerblue" stroke="dodgerblue" strokeWidth={2}>
      <Step kind="move" to={[20, 20]} />
      <Step kind="line" to={[100, 20]} />
      <Step kind="line" to={[60, 110]} />
      <Step kind="cycle" />
    </Path>
    {/* 绿色填充菱形 */}
    <Path fill="green" stroke="green" strokeWidth={2}>
      <Step kind="move" to={[180, 65]} />
      <Step kind="line" to={[230, 20]} />
      <Step kind="line" to={[280, 65]} />
      <Step kind="line" to={[230, 110]} />
      <Step kind="cycle" />
    </Path>
  </Layout>
);

export default Demo;

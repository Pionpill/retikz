import { Draw, DrawWay, Layout } from '@retikz/react';
import type { FC } from 'react';

/**
 * `DrawWay.Cycle` 闭合 + `fill` 填色
 * @description 半透明 fill + 同色 stroke 是 UML / 流程图常用配色。
 */
const Demo: FC = () => (
  <Layout width={360} height={160}>
    {/* 蓝色填充三角形 */}
    <Draw
      way={[[20, 20], [100, 20], [60, 110], DrawWay.Cycle]}
      fill="blue"
      stroke="blue"
      strokeWidth={2}
    />
    {/* 绿色填充菱形 */}
    <Draw
      way={[[180, 65], [230, 20], [280, 65], [230, 110], DrawWay.Cycle]}
      fill="green"
      stroke="green"
      strokeWidth={2}
    />
  </Layout>
);

export default Demo;

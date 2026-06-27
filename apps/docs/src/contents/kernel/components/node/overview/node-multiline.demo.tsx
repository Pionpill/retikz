import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={460} height={140}>
    {/* 模板字面量真换行 */}
    <Node id="center" position={[-150, 0]}>{`User
Service
v2.1`}</Node>
    {/* 字符串内嵌 \n */}
    <Node id="left" position={[0, 0]} align="left">
      {'Step 1: read\nStep 2: parse\nStep 3: emit'}
    </Node>
    {/* text prop 数组 */}
    <Node id="right" position={[160, 0]} align="right" text={['short', 'longer line', 'mid']} />
  </Layout>
);

export default Demo;

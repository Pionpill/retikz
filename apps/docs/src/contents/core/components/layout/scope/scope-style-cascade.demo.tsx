import { Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

/**
 * 主色级联：scope color 下传给内部全部元素
 * @description scope color=蓝 → 节点边 / 文字、path stroke / 箭头 / 边标注全蓝；
 *   锚点节点显式 fill="white" 截断主色填充（color 同样会染 fill），让文字可读。
 */
const Demo: FC = () => (
  <Layout width={420} height={130}>
    <Scope color="dodgerblue">
      <Node id="A" position={[0, 0]} shape="circle" fill="white">
        A
      </Node>
      <Node id="B" position={[180, 0]} shape="circle" fill="white">
        B
      </Node>
      <Path arrow="->">
        <Step kind="move" to="A" />
        <Step to="B" label={{ text: 'flow' }} />
      </Path>
    </Scope>
  </Layout>
);

export default Demo;

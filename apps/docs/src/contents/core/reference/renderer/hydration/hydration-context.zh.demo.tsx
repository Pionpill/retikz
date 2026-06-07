import { Layout, Node, pulse } from '@retikz/react';
import { type FC, useState } from 'react';

/**
 * 水合 ctx demo：handler 第二参 ctx 读 meta + 命令式触发动画
 * @description 节点带 `trigger:'manual'` 的 pop 动画（pulse 单次、不自播）；点击经 `ctx.animation.restart()`
 *   重播本节点动画，并经 `ctx.meta` 取 provenance 显示。含 hooks → ComponentPreview 须开 `interactive`。
 */
const Demo: FC = () => {
  const [last, setLast] = useState('—');

  return (
    <Layout width={300} height={160}>
      <Node
        id="ball"
        position={[0, 0]}
        shape="circle"
        fill="darkorange"
        stroke="none"
        meta={{ label: '小球' }}
        animations={[{ ...pulse({ peak: 1.4, duration: 500 }), trigger: 'manual', iterations: 1 }]}
        onClick={(event, ctx) => {
          setLast(String(ctx.meta?.label ?? ctx.id));
          ctx.animation.restart();
        }}
      >
        点我
      </Node>
      <Node id="hint" position={[0, -55]} stroke="none">
        ctx.meta.label：{last}
      </Node>
    </Layout>
  );
};

export default Demo;

import { Layout, Node, pulse } from '@retikz/react';
import { type FC, useState } from 'react';

/**
 * Hydration context demo: the handler's second arg reads meta + imperatively triggers animation
 * @description the node carries a `trigger:'manual'` pop (single-shot pulse, no autoplay); a click replays
 *   this node's animation via `context.animation.restart()` and reads provenance via `context.meta`. Uses hooks →
 *   ComponentPreview must enable `interactive`.
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
        meta={{ label: 'ball' }}
        animations={[{ ...pulse({ peak: 1.4, duration: 500 }), trigger: 'manual', iterations: 1 }]}
        onClick={(event, context) => {
          setLast(String(context.meta?.label ?? context.id));
          context.animation.restart();
        }}
      >
        click me
      </Node>
      <Node id="hint" position={[0, -55]} stroke="none">
        context.meta.label: {last}
      </Node>
    </Layout>
  );
};

export default Demo;

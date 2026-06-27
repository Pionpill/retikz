import { Draw, Layout, Node, pulse } from '@retikz/react';
import { type FC, useState } from 'react';

const GetStartStep4: FC = () => {
  const [count, setCount] = useState(0);

  return (
    <Layout width={420} height={120}>
      <Node
        id="a"
        position={[0, 0]}
        animations={[{ ...pulse({ peak: 1.25, duration: 420 }), trigger: 'manual', iterations: 1 }]}
        onClick={(_event, context) => {
          setCount(value => value + 1);
          context.animation.restart();
        }}
      >
        A
      </Node>
      <Node id="b" position={[100, 0]}>
        B
      </Node>
      <Node id="c" position={[200, 0]}>
        C
      </Node>
      <Draw way={['a', 'b']} />
      <Draw way={['b', 'c']} />
      <Node id="hint" position={[100, 45]} stroke="none" textColor="gray">
        clicks: {count}
      </Node>
    </Layout>
  );
};

export default GetStartStep4;
